use tauri::{AppHandle};
use rusqlite::{params};

use crate::db;
use crate::models::Media;

#[tauri::command]
pub fn get_media_by_id(app: tauri::AppHandle, id: i32) -> Result<Media, String> {
  let connection = db::get_connection(&app)
    .map_err(|e| e.to_string())?;

  let media = connection
    .query_row(
      "SELECT id, name, description, image_url FROM media WHERE id = ?1",
      [id],
      |row| {
        Ok(Media {
          id: row.get(0)?,
          name: row.get(1)?,
          description: row.get(2)?,
          image_url: row.get(3)?,
        })
      },
    )
    .map_err(|_| "Media not found".to_string())?;

  Ok(media)
}

#[tauri::command]
pub fn get_all_media(app: AppHandle) -> Result<Vec<Media>, String> {
  let connection = db::get_connection(&app)
    .map_err(|e| e.to_string())?;

  let mut stmt = connection
    .prepare("SELECT id, name, description, image_url FROM media")
    .map_err(|e| e.to_string())?;

  let media_iter = stmt
    .query_map([], |row| {
      Ok(Media {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        image_url: row.get(3)?,
      })
    })
    .map_err(|e| e.to_string())?;

  let mut media_list = Vec::new();
  for media in media_iter {
    media_list.push(media.map_err(|e| e.to_string())?);
  }

  Ok(media_list)
}

#[tauri::command]
pub fn get_media_by_tag(app: AppHandle, tag: String) -> Result<Vec<Media>, String> {
  let connection = db::get_connection(&app).map_err(|e| e.to_string())?;

  let mut stmt = connection
    .prepare(
      r#"
      SELECT m.id, m.name, m.description, m.image_url
      FROM media m
      JOIN media_tag mt ON mt.media_id = m.id
      JOIN tag t ON t.id = mt.tag_id
      WHERE t.name = ?
      ORDER BY m.name
      "#
    )
    .map_err(|e| e.to_string())?;

  let media_iter = stmt
    .query_map(params![tag], |row| {
      Ok(Media {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        image_url: row.get(3)?,
      })
    })
    .map_err(|e| e.to_string())?;

  let mut media_list = Vec::new();
  for media in media_iter {
    media_list.push(media.map_err(|e| e.to_string())?);
  }

  Ok(media_list)
}
