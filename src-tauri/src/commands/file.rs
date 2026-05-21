use std::path::PathBuf;
use tauri::AppHandle;

use crate::utils::file::get_app_data_dir;

#[tauri::command]
pub fn get_custom_app_data_dir(app: AppHandle) -> Result<PathBuf, String> {
  Ok(get_app_data_dir(&app))
}
