use std::{collections::HashMap, env};

use rusqlite::params;
use tauri::State;

use crate::{
  db::DbState,
  models::{
    api::ApiResponse,
    enums::{Language, MediaType, TagType},
    media::{
      ApiEntityRelation, ApiMedia, ApiMediaRelations, ApiSearchResult, ApiState, MediaBase,
      MediaData, MediaExtension,
    },
  },
};

fn get_tmdb_token() -> String {
  env::var("TMDB_API_TOKEN").unwrap_or_else(|_| "unable to find TMDB API token".to_string())
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

pub fn get_existing_media_info(
  state: &State<'_, DbState>,
  ids: &[u32],
  media_type: MediaType,
) -> Result<HashMap<u32, String>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;

  let ids_json = serde_json::to_string(&ids).map_err(|e| e.to_string())?;

  let mut stmt = connection
    .prepare(
      "SELECT id, external_id FROM media 
        WHERE media_type = ?1 
        AND external_id IN (SELECT value FROM json_each(?2))",
    )
    .map_err(|e| e.to_string())?;

  let existing_data = stmt
    .query_map(params![media_type.to_string(), ids_json], |row| {
      Ok((row.get::<_, u32>(1)?, row.get::<_, String>(0)?))
    })
    .map_err(|e| e.to_string())?
    .filter_map(|res| res.ok())
    .collect();

  Ok(existing_data)
}

pub fn get_local_id_by_external(
  state: &tauri::State<'_, DbState>,
  external_id: u32,
  media_type: &MediaType,
) -> Option<String> {
  let connection = state.connection.lock().ok()?;
  let mut stmt = connection
    .prepare(
      "SELECT id FROM media 
      WHERE external_id = ?1 AND media_type = ?2 
      LIMIT 1",
    )
    .ok()?;

  stmt
    .query_row(params![external_id, media_type.to_string()], |row| {
      row.get(0)
    })
    .ok()
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
        core: MediaBase {
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
          id: None,
          is_in_library: false,
          poster_path: item["poster_path"].as_str().map(|s| s.to_string()),
          backdrop_path: item["backdrop_path"].as_str().map(|s| s.to_string()),
        },
      })
    })
    .collect();

  // check if it's already in library
  let ids: Vec<u32> = results.iter().map(|r| r.state.external_id).collect();
  let existing_media = get_existing_media_info(&state, &ids, media_type)?;
  for item in &mut results {
    if let Some(local_id) = existing_media.get(&item.state.external_id) {
      item.state.is_in_library = true;
      item.state.id = Some(local_id.clone());
    }
  }

  Ok(results)
}

fn get_job_priority(job: &str) -> i32 {
  match job {
    "Director" | "Creator" => 1,
    "Screenplay" | "Writer" | "Author" | "Novel" => 2,
    "Story" | "Characters" => 3,
    _ => 100,
  }
}

fn map_tmdb_to_api_media(
  state: &tauri::State<'_, DbState>,
  external_id: u32,
  data: serde_json::Value,
  media_type: MediaType,
) -> Result<ApiMedia, String> {
  let mut persons: HashMap<String, ApiEntityRelation> = HashMap::new();
  let mut cast: HashMap<String, ApiEntityRelation> = HashMap::new();
  let mut companies: HashMap<String, ApiEntityRelation> = HashMap::new();
  let mut tags: HashMap<TagType, Vec<String>> = HashMap::new();

  // extract creators
  // -- for movie
  if media_type == MediaType::Movie {
    let mut featured_crew: Vec<(String, String)> = Vec::new();
    if let Some(crew) = data["credits"]["crew"].as_array() {
      for member in crew {
        if let (Some(name), Some(job)) = (member["name"].as_str(), member["job"].as_str()) {
          let priority = get_job_priority(job);
          if priority < 100 {
            featured_crew.push((name.to_string(), job.to_string()));
          }
        }
      }
    }

    featured_crew.sort_by_key(|item| get_job_priority(&item.1));

    for (index, (name, job)) in featured_crew.into_iter().take(6).enumerate() {
      let entry = persons.entry(name).or_insert(ApiEntityRelation {
        order: Some(index as u32),
        values: Vec::new(),
      });
      entry.values.push(job.to_uppercase());
    }
  } else {
    // -- for series
    if let Some(creators) = data["created_by"].as_array() {
      for (index, creator) in creators.iter().enumerate() {
        if let Some(name) = creator["name"].as_str() {
          persons
            .entry(name.to_string())
            .or_insert(ApiEntityRelation {
              order: Some(index as u32),
              values: vec!["CREATOR".to_string()],
            });
        }
      }
    }
  }

  // extract cast (only the 10 first actors)
  if let Some(c) = data["credits"]["cast"].as_array() {
    for (index, member) in c.iter().take(10).enumerate() {
      if let (Some(name), Some(role)) = (member["name"].as_str(), member["character"].as_str()) {
        let entry = cast.entry(name.to_string()).or_insert(ApiEntityRelation {
          order: Some(index as u32),
          values: Vec::new(),
        });
        entry.values.push(role.to_string());
      }
    }
  }

  // extract companies
  if let Some(production_companies) = data["production_companies"].as_array() {
    for (index, comp) in production_companies.iter().enumerate() {
      if let Some(name) = comp["name"].as_str() {
        companies
          .entry(name.to_string())
          .or_insert(ApiEntityRelation {
            order: Some(index as u32),
            values: vec!["PRODUCTION".to_string()],
          });
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
    .flat_map(|s| {
      s.split(['&', '/'])
        .map(|part| part.trim().to_string())
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
    })
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

  let local_id = get_local_id_by_external(state, external_id, &media_type);

  Ok(ApiMedia {
    data: MediaData { base, extension },
    state: ApiState {
      external_id,
      id: local_id.clone(),
      is_in_library: local_id.is_some(),
      poster_path: data["poster_path"].as_str().map(|s| s.to_string()),
      backdrop_path: data["backdrop_path"].as_str().map(|s| s.to_string()),
    },
    relations: ApiMediaRelations {
      persons,
      cast,
      companies,
      tags,
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
