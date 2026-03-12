use std::{
  collections::{HashMap, HashSet},
  env,
};

use rusqlite::params;
use tauri::State;

use crate::{
  db::DbState,
  models::{
    api::ApiResponse,
    enums::{Language, MediaType, TagType},
    media::{
      ApiMedia, ApiSearchResult, ApiState, MediaBase, MediaCore, MediaData, MediaExtension,
      MediaRelations,
    },
  },
};

fn get_tmdb_token() -> String {
  env::var("TMDB_API_TOKEN").unwrap_or_else(|_| "unable to find TMDB API token".to_string())
}

fn get_image_url() -> String {
  "https://image.tmdb.org/t/p".to_string()
}

fn get_media_url() -> String {
  "https://api.themoviedb.org/3".to_string()
}

fn get_endpoint_from_media_type(media_type: MediaType) -> String {
  if media_type == MediaType::Series {
    "tv".to_string()
  } else {
    "movie".to_string()
  }
}

fn format_language(language: Language) -> String {
  let language_str = language.to_string();
  format!(
    "{}-{}",
    language_str.to_lowercase(),
    language_str.to_uppercase()
  )
}

pub fn get_existing_external_ids(
  state: &State<'_, DbState>,
  ids: &[u32],
  media_type: MediaType,
) -> Result<HashSet<u32>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;

  let ids_json = serde_json::to_string(&ids).map_err(|e| e.to_string())?;

  let mut stmt = connection
    .prepare(
      "SELECT external_id FROM media 
       WHERE media_type = ?1 
       AND external_id IN (SELECT value FROM json_each(?2))",
    )
    .map_err(|e| e.to_string())?;

  let existing_ids = stmt
    .query_map(params![media_type.to_string(), ids_json], |row| {
      row.get::<_, u32>(0)
    })
    .map_err(|e| e.to_string())?
    .filter_map(|id| id.ok())
    .collect();

  Ok(existing_ids)
}

pub fn is_media_in_library(
  state: &tauri::State<'_, DbState>,
  external_id: u32,
  media_type: &MediaType,
) -> bool {
  let connection = state.connection.lock().unwrap();
  let mut stmt = connection
    .prepare("SELECT 1 FROM media WHERE external_id = ?1 AND media_type = ?2 LIMIT 1")
    .unwrap();

  stmt
    .exists(params![external_id, media_type.to_string()])
    .unwrap_or(false)
}

pub async fn fetch_from_tmdb(
  state: tauri::State<'_, DbState>,
  media_type: MediaType,
  query: &str,
  language: Language,
) -> Result<Vec<ApiSearchResult>, String> {
  let token = get_tmdb_token();

  // build url
  let endpoint = get_endpoint_from_media_type(media_type.clone());
  let formatted_language = format_language(language);
  let url = format!(
    "{}/search/{}?query={}&language={}",
    get_media_url(),
    endpoint,
    urlencoding::encode(query),
    formatted_language
  );

  // get row data
  let client = reqwest::Client::new();
  let response: ApiResponse = client
    .get(url)
    .header("Authorization", format!("Bearer {}", token))
    .header("accept", "application/json")
    .send()
    .await
    .map_err(|e| e.to_string())?
    .json()
    .await
    .map_err(|e| e.to_string())?;

  // keep only wanted fields
  let mut results: Vec<ApiSearchResult> = response
    .results
    .into_iter()
    .filter_map(|item| {
      Some(ApiSearchResult {
        core: MediaCore {
          media_type: media_type.clone(),
          title: item["title"]
            .as_str()
            .or(item["name"].as_str())
            .unwrap_or("Untitled")
            .to_string(),
          release_date: item["release_date"]
            .as_str()
            .or(item["first_air_date"].as_str())
            .unwrap_or("")
            .to_string(),
          description: item["overview"].as_str().unwrap_or("").to_string(),
        },
        state: ApiState {
          external_id: item["id"].as_u64()? as u32,
          is_in_library: false,
          poster_path: item["poster_path"].as_str().map(|s| s.to_string()),
          backdrop_path: item["backdrop_path"].as_str().map(|s| s.to_string()),
        },
      })
    })
    .collect();

  // check if it's already in library
  let ids: Vec<u32> = results.iter().map(|r| r.state.external_id).collect();
  let existing_ids = get_existing_external_ids(&state, &ids, media_type)?;
  for item in &mut results {
    item.state.is_in_library = existing_ids.contains(&item.state.external_id);
  }

  Ok(results)
}

fn map_tmdb_to_api_media(
  state: &tauri::State<'_, DbState>,
  external_id: u32,
  data: serde_json::Value,
  media_type: MediaType,
) -> Result<ApiMedia, String> {
  let mut persons: HashMap<String, Vec<String>> = HashMap::new();
  let mut companies: HashMap<String, Vec<String>> = HashMap::new();
  let mut tags: HashMap<TagType, Vec<String>> = HashMap::new();

  // extract person
  // -- crew
  if let Some(crew) = data["credits"]["crew"].as_array() {
    for member in crew {
      if let (Some(name), Some(job)) = (member["name"].as_str(), member["job"].as_str()) {
        persons
          .entry(name.to_string())
          .or_default()
          .push(job.to_uppercase());
      }
    }
  }
  // -- cast (only the 10 first actors)
  if let Some(cast) = data["credits"]["cast"].as_array() {
    for member in cast.iter().take(10) {
      if let Some(name) = member["name"].as_str() {
        persons
          .entry(name.to_string())
          .or_default()
          .push("ACTOR".to_string());
      }
    }
  }
  // -- creators (for series)
  if let Some(creators) = data["created_by"].as_array() {
    for creator in creators {
      if let Some(name) = creator["name"].as_str() {
        persons
          .entry(name.to_string())
          .or_default()
          .push("CREATOR".to_string());
      }
    }
  }

  // extract companies
  if let Some(production_companies) = data["production_companies"].as_array() {
    for comp in production_companies {
      if let Some(name) = comp["name"].as_str() {
        companies
          .entry(name.to_string())
          .or_default()
          .push("PRODUCTION".to_string());
      }
    }
  }

  // tag
  // genre
  let genres: Vec<String> = data["genres"]
    .as_array()
    .unwrap_or(&vec![])
    .iter()
    .filter_map(|g| g["name"].as_str().map(|s| s.to_string()))
    .collect();
  if !genres.is_empty() {
    tags.insert(TagType::Genre, genres);
  }
  // saga (for movies)
  if let Some(collection) = data["belongs_to_collection"].as_object() {
    let raw_name = collection["name"].as_str().unwrap_or("");
    let saga_name = raw_name
      .replace(" Collection", " Saga")
      .replace(" collection", " Saga")
      .trim()
      .to_string();
    tags.insert(TagType::Saga, vec![saga_name]);
  }

  let base = MediaBase {
    core: MediaCore {
      media_type: media_type.clone(),
      title: data["title"]
        .as_str()
        .or(data["name"].as_str())
        .unwrap_or("Untitled")
        .to_string(),
      release_date: data["release_date"]
        .as_str()
        .or(data["first_air_date"].as_str())
        .unwrap_or("")
        .to_string(),
      description: data["overview"].as_str().unwrap_or("").to_string(),
    },
    relations: MediaRelations {
      persons,
      companies,
      tags,
    },
  };

  // add detailed infos
  let extension = match media_type {
    MediaType::Movie => MediaExtension::Movie {
      duration: data["runtime"].as_i64().unwrap_or(0) as i32,
    },
    MediaType::Series => MediaExtension::Series {
      seasons: data["number_of_seasons"].as_i64().unwrap_or(0) as i32,
      episodes: data["number_of_episodes"].as_i64().unwrap_or(0) as i32,
    },
    _ => MediaExtension::None,
  };

  Ok(ApiMedia {
    data: MediaData { base, extension },
    state: ApiState {
      external_id,
      is_in_library: is_media_in_library(state, external_id, &media_type),
      poster_path: Some(format!(
        "{}/original{}",
        get_image_url(),
        data["poster_path"].as_str().unwrap_or("")
      )),
      backdrop_path: Some(format!(
        "{}/original{}",
        get_image_url(),
        data["backdrop_path"].as_str().unwrap_or("")
      )),
    },
  })
}

#[tauri::command]
pub async fn fetch_detailed_from_tmdb(
  state: &tauri::State<'_, DbState>,
  external_id: u32,
  media_type: MediaType,
  language: Language,
) -> Result<ApiMedia, String> {
  let token = get_tmdb_token();
  let client = reqwest::Client::new();

  // build url
  let endpoint = get_endpoint_from_media_type(media_type.clone());
  let formatted_language = format_language(language);
  let url = format!(
    "{}/{}/{}?append_to_response=credits&language={}",
    get_media_url(),
    endpoint,
    external_id,
    formatted_language
  );

  let full_data: serde_json::Value = client
    .get(url)
    .header("Authorization", format!("Bearer {}", token))
    .send()
    .await
    .map_err(|e| e.to_string())?
    .json()
    .await
    .map_err(|e| e.to_string())?;

  map_tmdb_to_api_media(state, external_id, full_data, media_type)
}
