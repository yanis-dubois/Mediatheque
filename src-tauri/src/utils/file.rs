use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_app_data_dir(app: &AppHandle) -> PathBuf {
  let mut path = app
    .path()
    .app_data_dir()
    .expect("failed to get app data dir");

  // change app data dir if dev mode
  if cfg!(debug_assertions) {
    if let Some(dir_name) = path.file_name().and_then(|n| n.to_str()) {
      // use com.mediatheque-dev.desktop if possible
      if dir_name.ends_with(".desktop") {
        let new_dir_name = dir_name.replace(".desktop", "-dev.desktop");
        path.set_file_name(new_dir_name);
      }
      // else use mediatheque-dev
      else {
        path.set_file_name(format!("{}-dev", dir_name));
      }
    }
  }

  path
}
