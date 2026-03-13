use dotenvy::dotenv;

mod api;
mod commands;
mod db;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  dotenv().ok(); // TODO: change that for the release (as .env wouldn't be available in shipping app)

  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      db::setup_db(&app.handle()).expect("failed to initialize database");
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::path::get_posters_dir,
      commands::settings::get_all_settings,
      commands::settings::save_setting,
      commands::media::get_media_by_id,
      commands::media::get_media_batch,
      commands::media::toggle_media_favorite,
      commands::media::update_media_status,
      commands::media::update_media_notes,
      commands::media::update_media_score,
      commands::media::add_media_to_library,
      commands::collection::search_layout_data,
      commands::collection::search_in_collection,
      commands::collection::get_collection_by_id,
      commands::collection::get_collection_batch,
      commands::collection::search_in_collections,
      commands::collection::toggle_collection_favorite,
      commands::collection::update_collection_name,
      commands::collection::update_collection_description,
      commands::collection::update_collection_preferred_layout,
      commands::collection::update_collection_sort,
      commands::collection::update_collection_filter,
      commands::collection::update_collection_media_type,
      commands::collection::add_media_batch_to_collection,
      commands::collection::add_media_to_collection_batch,
      commands::collection::remove_media_from_collection,
      commands::collection::create_collection,
      commands::collection::delete_collection,
      commands::collection::search_in_meta_data,
      commands::pin::get_all_pins,
      commands::pin::pin_collection,
      commands::pin::unpin_collection,
      commands::pin::update_pinned_collections,
      commands::entity::search_in_library,
      commands::metadata::get_person_batch,
      commands::metadata::get_person_by_id,
      commands::metadata::get_company_batch,
      commands::metadata::get_company_by_id,
      commands::metadata::get_saga_batch,
      commands::metadata::get_saga_by_id,
      commands::metadata::get_genre_batch,
      commands::metadata::get_genre_by_id,
      commands::metadata::get_game_mechanic_batch,
      commands::metadata::get_game_mechanic_by_id,
      commands::metadata::get_metadata_layout,
      commands::metadata::get_all_roles_for_descriptor,
      commands::api::search_media_on_internet,
      commands::api::get_api_media_by_id,
      commands::api::add_media_from_internet,
      commands::api::refresh_media_data_from_internet,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
