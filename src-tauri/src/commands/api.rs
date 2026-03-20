use tauri::Manager;

use crate::{
  api::provider::ProviderStore,
  commands::media::{
    add_media_to_library, get_local_id_batch_by_external, get_local_id_by_external,
    update_media_data,
  },
  db::DbState,
  models::{
    enums::{Language, MediaType},
    media::{ApiMedia, ApiSearchResult},
  },
};

#[tauri::command]
pub async fn search_media_on_internet(
  db_state: tauri::State<'_, DbState>,
  provider_store: tauri::State<'_, ProviderStore>,
  query: String,
  media_type: MediaType,
  language: Language,
) -> Result<Vec<ApiSearchResult>, String> {
  // get API results
  let provider = provider_store
    .get(&media_type)
    .ok_or_else(|| "Failed to retrieve provider".to_string())?;
  let mut results = provider.search(&query, language).await?;

  // check if results are already in library
  let ids: Vec<u32> = results.iter().map(|r| r.state.external_id).collect();
  let existing_media = get_local_id_batch_by_external(&db_state, &ids, media_type)?;
  for item in &mut results {
    if let Some(local_id) = existing_media.get(&item.state.external_id) {
      item.state.is_in_library = true;
      item.state.id = Some(local_id.clone());
    }
  }

  Ok(results)
}

async fn get_api_media(
  provider_store: &tauri::State<'_, ProviderStore>,
  external_id: u32,
  media_type: &MediaType,
  language: Language,
) -> Result<ApiMedia, String> {
  // get API results
  let provider = provider_store
    .get(&media_type)
    .ok_or_else(|| "Failed to retrieve provider".to_string())?;
  provider.get_by_id(external_id, language).await
}

#[tauri::command]
pub async fn get_api_media_by_id(
  db_state: tauri::State<'_, DbState>,
  provider_store: tauri::State<'_, ProviderStore>,
  external_id: u32,
  media_type: MediaType,
  language: Language,
) -> Result<ApiMedia, String> {
  // get API results
  let mut result = get_api_media(&provider_store, external_id, &media_type, language).await?;

  // check if result is already in library
  let local_id = get_local_id_by_external(&db_state, external_id, &media_type);
  result.state.id = local_id.clone();
  result.state.is_in_library = local_id.is_some();

  Ok(result)
}

#[tauri::command]
pub async fn add_media_from_internet(
  app: tauri::AppHandle,
  external_id: u32,
  media_type: MediaType,
  language: Language,
) -> Result<String, String> {
  let api_media = get_api_media(
    &app.state::<ProviderStore>(),
    external_id,
    &media_type,
    language,
  )
  .await?;

  add_media_to_library(app, api_media).await
}

#[tauri::command]
pub async fn refresh_media_data_from_internet(
  app: tauri::AppHandle,
  id: String,
  external_id: u32,
  media_type: MediaType,
  language: Language,
) -> Result<(), String> {
  let api_media = get_api_media(
    &app.state::<ProviderStore>(),
    external_id,
    &media_type,
    language,
  )
  .await?;

  update_media_data(app, id, api_media).await
}
