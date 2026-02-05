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
      commands::media::get_media_list,
      commands::media::toggle_media_favorite,
      commands::media::update_media_status,
      commands::media::update_media_notes,
      commands::media::add_media_to_library
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
