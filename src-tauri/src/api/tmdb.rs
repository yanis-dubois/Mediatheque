use std::{
  collections::{HashMap, HashSet},
  env,
};

use rusqlite::params;
use tauri::State;

use crate::{
  db::DbState,
  models::{
    api::{ApiResponse, ApiSearchResult},
    enums::{Language, MediaType},
    external_media::{ExternalMedia, ExternalMediaRequest, ExternalMovie, ExternalSeries},
  },
};

fn get_tmdb_token() -> String {
  env::var("TMDB_API_TOKEN").unwrap_or_else(|_| "unable to find TMDB API token".to_string())
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

  // 3. Requête SQL filtrée par external_id ET media_type
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

pub async fn fetch_from_tmdb(
  state: tauri::State<'_, DbState>,
  media_type: MediaType,
  query: &str,
  language: Language,
) -> Result<Vec<ApiSearchResult>, String> {
  let endpoint = get_endpoint_from_media_type(media_type.clone());
  let formatted_language = format_language(language);

  let token = get_tmdb_token();
  let url = format!(
    "https://api.themoviedb.org/3/search/{}?query={}&language={}",
    endpoint,
    urlencoding::encode(query),
    formatted_language
  );

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

  let mut results: Vec<ApiSearchResult> = response
    .results
    .into_iter()
    .filter_map(|item| {
      Some(ApiSearchResult {
        id: item["id"].as_u64()? as u32,
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
        media_type: media_type.clone(),
        poster_path: item["poster_path"].as_str().map(|s| s.to_string()),
        overview: item["overview"].as_str().unwrap_or("").to_string(),
        is_in_library: false,
      })
    })
    .collect();

  let ids: Vec<u32> = results.iter().map(|r| r.id).collect();

  let existing_ids = get_existing_external_ids(&state, &ids, media_type)?;

  for item in &mut results {
    item.is_in_library = existing_ids.contains(&item.id);
  }

  Ok(results)
}

fn map_tmdb_to_external_request(
  external_id: u32,
  data: serde_json::Value,
  media_type: MediaType,
) -> Result<ExternalMediaRequest, String> {
  let mut persons: HashMap<String, Vec<String>> = HashMap::new();
  let mut companies: HashMap<String, Vec<String>> = HashMap::new();

  // extract person crew
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
  // extract person cast (only the 10 first actors)
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
  // extract person creators for series
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

  let base = ExternalMedia {
    external_id,
    media_type: media_type.clone(),
    title: data["title"]
      .as_str()
      .or(data["name"].as_str())
      .unwrap_or("")
      .to_string(),
    image_url: format!(
      "https://image.tmdb.org/t/p/original{}",
      data["poster_path"].as_str().unwrap_or("")
    ),
    backdrop_url: format!(
      "https://image.tmdb.org/t/p/original{}",
      data["backdrop_path"].as_str().unwrap_or("")
    ),
    description: data["overview"].as_str().unwrap_or("").to_string(),
    release_date: data["release_date"]
      .as_str()
      .or(data["first_air_date"].as_str())
      .unwrap_or("")
      .to_string(),
    persons,
    companies,
  };

  // add detailed infos
  match media_type {
    MediaType::Movie => {
      let saga = if let Some(collection) = data["belongs_to_collection"].as_object() {
        let raw_name = collection["name"].as_str().unwrap_or("");
        vec![raw_name
          .replace(" Collection", " Saga")
          .replace(" collection", " Saga")
          .trim()
          .to_string()]
      } else {
        vec![]
      };

      Ok(ExternalMediaRequest::Movie(ExternalMovie {
        base,
        duration: data["runtime"].as_i64().unwrap_or(0) as i32,
        genre: data["genres"]
          .as_array()
          .unwrap_or(&vec![])
          .iter()
          .filter_map(|g| g["name"].as_str().map(|s| s.to_string()))
          .collect(),
        saga,
      }))
    }
    MediaType::Series => Ok(ExternalMediaRequest::Series(ExternalSeries {
      base,
      seasons: data["number_of_seasons"].as_i64().unwrap_or(0) as i32,
      episodes: data["number_of_episodes"].as_i64().unwrap_or(0) as i32,
      genre: data["genres"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter_map(|g| g["name"].as_str().map(|s| s.to_string()))
        .collect(),
    })),
    _ => Err("Unsupported media type".to_string()),
  }
}

#[tauri::command]
pub async fn fetch_detailed_from_tmdb(
  external_id: u32,
  media_type: MediaType,
  language: Language,
) -> Result<ExternalMediaRequest, String> {
  let token = get_tmdb_token();
  let client = reqwest::Client::new();

  let endpoint = get_endpoint_from_media_type(media_type.clone());
  let formatted_language = format_language(language);
  let url = format!(
    "https://api.themoviedb.org/3/{}/{}?append_to_response=credits&language={}",
    endpoint, external_id, formatted_language
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

  map_tmdb_to_external_request(external_id, full_data, media_type)
}
