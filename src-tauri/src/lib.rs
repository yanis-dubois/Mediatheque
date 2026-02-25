mod db;
mod models;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      db::setup_db(&app.handle())
        .expect("failed to initialize database");
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::path::get_posters_dir,
      commands::media::get_media_by_id,
      commands::media::get_media_batch,
      commands::media::toggle_media_favorite,
      commands::media::update_media_status,
      commands::media::update_media_notes,
      commands::media::add_media_to_library,
      commands::collection::search_layout_data,
      commands::collection::search_in_collection,
      commands::collection::get_collection_by_id,
      commands::collection::get_collection_batch,
      commands::collection::get_collection_layout_data,
      commands::collection::search_in_collections,
      commands::collection::toggle_collection_favorite,
      commands::collection::update_collection_name,
      commands::collection::update_collection_description,
      commands::collection::update_collection_preferred_layout,
      commands::collection::update_collection_sort,
      commands::collection::update_collection_filter,
      commands::collection::update_collection_media_type,
      commands::collection::update_pinned_collections,
      commands::collection::add_media_batch_to_collection,
      commands::collection::add_media_to_collection_batch,
      commands::collection::remove_media_from_collection,
      commands::collection::create_collection,
      commands::collection::delete_collection,
      commands::pin::get_all_pins,
      commands::pin::pin_collection,
      commands::pin::unpin_collection,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
