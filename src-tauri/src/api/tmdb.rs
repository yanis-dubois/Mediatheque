use std::{collections::HashSet, env};

use rusqlite::params;
use tauri::State;

use crate::{
  db::DbState,
  models::{
    api::{ApiResponse, ApiSearchResult},
    enums::MediaType,
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
) -> Result<Vec<ApiSearchResult>, String> {
  let endpoint = get_endpoint_from_media_type(media_type.clone());

  let token = get_tmdb_token();
  let url = format!(
    "https://api.themoviedb.org/3/search/{}?query={}&language=fr-FR",
    endpoint,
    urlencoding::encode(query)
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
  let base = ExternalMedia {
    external_id: external_id,
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
    description: data["overview"].as_str().unwrap_or("").to_string(),
    release_date: data["release_date"]
      .as_str()
      .or(data["first_air_date"].as_str())
      .unwrap_or("")
      .to_string(),
  };

  match media_type {
    MediaType::Movie => {
      let directors = data["credits"]["crew"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .filter(|c| c["job"] == "Director")
        .map(|c| c["name"].as_str().unwrap().to_string())
        .collect();

      Ok(ExternalMediaRequest::Movie(ExternalMovie {
        base,
        directors,
        duration: data["runtime"].as_i64().unwrap_or(0) as i32,
        genre: data["genres"]
          .as_array()
          .unwrap_or(&vec![])
          .iter()
          .map(|g| g["name"].as_str().unwrap().to_string())
          .collect(),
        saga: vec![], // TODO: needs "belongs_to_collection" in JSON
      }))
    }
    MediaType::Series => Ok(ExternalMediaRequest::Series(ExternalSeries {
      base,
      creators: data["created_by"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|c| c["name"].as_str().unwrap().to_string())
        .collect(),
      seasons: data["number_of_seasons"].as_i64().unwrap_or(0) as i32,
      episodes: data["number_of_episodes"].as_i64().unwrap_or(0) as i32,
      genre: data["genres"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|g| g["name"].as_str().unwrap().to_string())
        .collect(),
    })),
    _ => Err("Unsupported media type".to_string()),
  }
}

#[tauri::command]
pub async fn fetch_detailed_from_tmdb(
  external_id: u32,
  media_type: MediaType,
) -> Result<ExternalMediaRequest, String> {
  let token = get_tmdb_token();
  let client = reqwest::Client::new();

  let endpoint = get_endpoint_from_media_type(media_type.clone());
  let url = format!(
    "https://api.themoviedb.org/3/{}/{}?append_to_response=credits&language=fr-FR",
    endpoint, external_id
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
