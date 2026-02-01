mod db;
mod models;
mod commands {
  pub mod media;
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
            greet,
            commands::media::get_media_by_id,
            commands::media::get_all_media
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
