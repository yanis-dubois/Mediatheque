use crate::{
  api::tmdb::{fetch_detailed_from_tmdb, fetch_from_tmdb},
  commands::media::add_media_to_library,
  db::DbState,
  models::{api::ApiSearchResult, enums::MediaType},
};

#[tauri::command]
pub async fn search_media_on_internet(
  state: tauri::State<'_, DbState>,
  query: String,
  media_type: MediaType,
) -> Result<Vec<ApiSearchResult>, String> {
  match media_type {
    MediaType::Book => todo!(),
    MediaType::Movie => fetch_from_tmdb(state, MediaType::Movie, &query).await,
    MediaType::Series => fetch_from_tmdb(state, MediaType::Series, &query).await,
    MediaType::VideoGame => todo!(),
    MediaType::TabletopGame => todo!(),
  }
}

#[tauri::command]
pub async fn add_media_from_internet(
  app: tauri::AppHandle,
  external_id: u32,
  media_type: MediaType,
) -> Result<(), String> {
  let movie = match media_type {
    MediaType::Book => todo!(),
    MediaType::Movie => fetch_detailed_from_tmdb(external_id, MediaType::Movie).await,
    MediaType::Series => fetch_detailed_from_tmdb(external_id, MediaType::Series).await,
    MediaType::VideoGame => todo!(),
    MediaType::TabletopGame => todo!(),
  }?;
  add_media_to_library(app, movie).await
}
