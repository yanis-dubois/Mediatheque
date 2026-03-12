use tauri::Manager;

use crate::{
  api::tmdb::{fetch_detailed_from_tmdb, fetch_from_tmdb},
  commands::media::add_media_to_library,
  db::DbState,
  models::{
    enums::{Language, MediaType},
    media::{ApiMedia, ApiSearchResult},
  },
};

#[tauri::command]
pub async fn search_media_on_internet(
  state: tauri::State<'_, DbState>,
  query: String,
  media_type: MediaType,
  language: Language,
) -> Result<Vec<ApiSearchResult>, String> {
  match media_type {
    MediaType::Book => todo!(),
    MediaType::Movie => fetch_from_tmdb(state, MediaType::Movie, &query, language).await,
    MediaType::Series => fetch_from_tmdb(state, MediaType::Series, &query, language).await,
    MediaType::VideoGame => todo!(),
    MediaType::TabletopGame => todo!(),
  }
}

#[tauri::command]
pub async fn get_api_media_by_id(
  state: tauri::State<'_, DbState>,
  external_id: u32,
  media_type: MediaType,
  language: Language,
) -> Result<ApiMedia, String> {
  let api_media = match media_type {
    MediaType::Book => todo!(),
    MediaType::Movie => {
      fetch_detailed_from_tmdb(&state, external_id, MediaType::Movie, language).await
    }
    MediaType::Series => {
      fetch_detailed_from_tmdb(&state, external_id, MediaType::Series, language).await
    }
    MediaType::VideoGame => todo!(),
    MediaType::TabletopGame => todo!(),
  }?;

  Ok(api_media)
}

#[tauri::command]
pub async fn add_media_from_internet(
  app: tauri::AppHandle,
  external_id: u32,
  media_type: MediaType,
  language: Language,
  base_url: String,
) -> Result<(), String> {
  let state = app.state::<DbState>();

  let api_media = get_api_media_by_id(state, external_id, media_type, language).await?;

  add_media_to_library(app, api_media, base_url).await
}
