mod db;
mod models;
mod commands {
  pub mod media;
}

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
      commands::media::get_media_by_id,
      commands::media::get_all_media,
      commands::media::get_favorite_media,
      commands::media::get_media_by_status,
      commands::media::toggle_media_favorite,
      commands::media::update_media_status,
      commands::media::update_media_notes,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
