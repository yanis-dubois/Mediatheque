use std::collections::HashMap;

use rusqlite::params;

use crate::{
  db::DbState,
  models::enums::{SettingValue, SettingsKey},
};

#[tauri::command]
pub fn get_all_settings(
  state: tauri::State<'_, DbState>,
) -> Result<HashMap<String, String>, String> {
  println!("get_all_settings");

  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  let mut stmt = connection
    .prepare("SELECT key, value FROM settings")
    .unwrap();

  let rows = stmt
    .query_map([], |row| {
      Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })
    .unwrap();

  let mut map = HashMap::new();
  for row in rows {
    let (k, v) = row.unwrap();
    map.insert(k, v);
  }

  println!("settings : {:?}", map);

  Ok(map)
}

#[tauri::command]
pub fn save_setting(
  state: tauri::State<'_, DbState>,
  key: SettingsKey,
  value: SettingValue,
) -> Result<(), String> {
  println!("save_setting : {:?}", value);

  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  connection
    .execute(
      "INSERT INTO settings (key, value) 
        VALUES (?1, ?2) 
        ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![key.to_string(), value.to_db_string()],
    )
    .map_err(|e| e.to_string())?;

  Ok(())
}
