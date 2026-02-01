use rusqlite::{params};

use crate::db::{DbState};
use crate::models::media::Media;
use crate::models::enums::{MediaType, MediaStatus};

// convert SQL TEXT -> Enums
fn match_media_type(s: &str) -> MediaType {
  match s {
      "BOOK" => MediaType::Book,
      "TV_SHOW" => MediaType::TvShow,
      "VIDEO_GAME" => MediaType::VideoGame,
      "TABLETOP_GAME" => MediaType::TabletopGame,
      _ => MediaType::Movie, // default
  }
}
fn match_media_status(s: &str) -> MediaStatus {
  match s {
      "IN_PROGRESS" => MediaStatus::InProgress,
      "FINISHED" => MediaStatus::Finished,
      "DROPPED" => MediaStatus::Dropped,
      _ => MediaStatus::ToDiscover, // default
  }
}

// convert SQL -> Media
fn map_row_to_media(row: &rusqlite::Row) -> rusqlite::Result<Media> {

  // data that has to be transformed
  let type_str: String = row.get(1)?;
  let status_str: String = row.get(7)?;
  let fav_int: i32 = row.get(8)?;

  Ok(Media {
    id: row.get(0)?,
    media_type: match_media_type(&type_str),
    title: row.get(2)?,
    image_url: row.get(3)?,
    description: row.get(4)?,
    release_date: row.get(5)?,
    added_date: row.get(6)?,
    status: match_media_status(&status_str),
    favorite: fav_int == 1, // 0/1 -> bool
    notes: row.get(9)?,
  })
}

#[tauri::command]
pub fn get_media_by_id(state: tauri::State<'_, DbState>, id: i32) -> Result<Media, String> {
  println!("get_media_by_id");
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  let media = connection.query_row(
      "SELECT 
          id, type, title, image_url, description, 
          release_date, added_date, status, favorite, notes 
        FROM media WHERE id = ?1",
      [id],
      map_row_to_media,
  )
  .map_err(|e| format!("Media not found or error: {}", e))?;

  println!("retrieve media : {}", media.title);
  Ok(media)
}

#[tauri::command]
pub fn get_all_media(state: tauri::State<'_, DbState>) -> Result<Vec<Media>, String> {
  println!("get_all_media");
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  let mut stmt = connection
    .prepare(
      "SELECT id, type, title, image_url, description, 
              release_date, added_date, status, favorite, notes 
      FROM media"
    )
    .map_err(|e| e.to_string())?;

  // map rows on Media struct
  let media_list = stmt
    .query_map([], map_row_to_media)
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  println!("retrieve medias : {}", media_list.len());
  Ok(media_list)
}

#[tauri::command]
pub fn get_favorite_media(state: tauri::State<'_, DbState>) -> Result<Vec<Media>, String> {
  println!("get_favorite_media");

  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  let mut stmt = connection
    .prepare(
      "SELECT id, type, title, image_url, description, 
              release_date, added_date, status, favorite, notes 
      FROM media 
      WHERE favorite = 1"
    )
    .map_err(|e| e.to_string())?;

  // map rows on Media struct
  let media_list = stmt
    .query_map([], map_row_to_media)
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  println!("retrieve favorites : {}", media_list.len());
  Ok(media_list)
}

// #[tauri::command]
// pub fn get_media_by_tag(app: AppHandle, tag: String) -> Result<Vec<Media>, String> {
//   let connection = db::get_connection(&app).map_err(|e| e.to_string())?;

//   let mut stmt = connection
//     .prepare(
//       r#"
//       SELECT m.id, m.name, m.description, m.image_url
//       FROM media m
//       JOIN media_tag mt ON mt.media_id = m.id
//       JOIN tag t ON t.id = mt.tag_id
//       WHERE t.name = ?
//       ORDER BY m.name
//       "#
//     )
//     .map_err(|e| e.to_string())?;

//   let media_iter = stmt
//     .query_map(params![tag], |row| {
//       Ok(Media {
//         id: row.get(0)?,
//         title: row.get(1)?,
//         description: row.get(2)?,
//         image_url: row.get(3)?,
//       })
//     })
//     .map_err(|e| e.to_string())?;

//   let mut media_list = Vec::new();
//   for media in media_iter {
//     media_list.push(media.map_err(|e| e.to_string())?);
//   }

//   Ok(media_list)
// }
