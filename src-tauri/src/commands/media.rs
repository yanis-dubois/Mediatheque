use crate::db::{DbState};
use crate::models::media::{Media, AnyMedia, Movie, Series};
use crate::models::enums::{MediaType, MediaStatus};

// convert SQL TEXT -> Enums
fn match_media_type(s: &str) -> MediaType {
  match s {
      "BOOK" => MediaType::Book,
      "SERIES" => MediaType::Series,
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
pub fn get_media_by_id(state: tauri::State<'_, DbState>, id: i32) -> Result<AnyMedia, String> {
  println!("get_media_by_id");

  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  // retrieve data from Media
  let mut stmt = connection.prepare("SELECT * FROM media WHERE id = ?1")
      .map_err(|e| e.to_string())?;

  let base = stmt.query_row([id], map_row_to_media)
      .map_err(|e| e.to_string())?;

  println!("retrieved base media : {}", base.title);

  // retrieve data from specific type
  match base.media_type {
    MediaType::Movie => {
      let movie = connection.query_row(
        "SELECT 
          m.duration, m.serie,
          (SELECT GROUP_CONCAT(d.name) FROM person d 
            JOIN movie_director md ON d.id = md.director_id 
            WHERE md.movie_id = m.media_id) as directors,
          (SELECT GROUP_CONCAT(g.name) FROM genre g 
            JOIN movie_genre mg ON g.id = mg.genre_id 
            WHERE mg.movie_id = m.media_id) as genres
        FROM movie m WHERE m.media_id = ?1",
        [id],
        |row| {
          let d_str: Option<String> = row.get("directors")?;
          let g_str: Option<String> = row.get("genres")?;
          
          Ok(Movie {
            base,
            duration: row.get("duration")?,
            serie: row.get("serie")?,
            directors: d_str.map(|s| s.split(',').map(String::from).collect()).unwrap_or_default(),
            genre: g_str.map(|s| s.split(',').map(String::from).collect()).unwrap_or_default(),
          })
        }
      ).map_err(|e| e.to_string())?;

      Ok(AnyMedia::Movie(movie))
    },
    MediaType::Series => {
      let series = connection.query_row(
        "SELECT 
          s.seasons, s.episodes,
          (SELECT GROUP_CONCAT(p.name) FROM person p 
            JOIN series_creator sc ON p.id = sc.creator_id 
            WHERE sc.series_id = s.media_id) as creators,
          (SELECT GROUP_CONCAT(g.name) FROM genre g 
            JOIN series_genre sg ON g.id = sg.genre_id 
            WHERE sg.series_id = s.media_id) as genres
        FROM series s WHERE s.media_id = ?1",
        [id],
        |row| {
          let c_str: Option<String> = row.get("creators")?;
          let g_str: Option<String> = row.get("genres")?;

          Ok(Series {
            base,
            seasons: row.get("seasons")?,
            episodes: row.get("episodes")?,
            creators: c_str.map(|s| s.split(',').map(String::from).collect()).unwrap_or_default(),
            genre: g_str.map(|s| s.split(',').map(String::from).collect()).unwrap_or_default(),
          })
        }
      ).map_err(|e| {
        let err_msg = format!("SQL error for series (ID {}): {}", id, e);
        println!("{}", err_msg);
        err_msg
      })?;

      Ok(AnyMedia::Series(series))
    },
    // fallback : only base data
    _ => Ok(AnyMedia::Base(base)),
  }
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

#[tauri::command]
pub fn get_media_by_status(state: tauri::State<'_, DbState>, status: MediaStatus) -> Result<Vec<Media>, String> {
  // convert enum -> String
  let status_str = status.to_string();
  println!("get_media_by_status: {}", status_str);

  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  let mut stmt = connection
    .prepare(
      "SELECT id, type, title, image_url, description, 
              release_date, added_date, status, favorite, notes 
       FROM media 
       WHERE status = ?1"
    )
    .map_err(|e| e.to_string())?;

  let media_list = stmt
    .query_map([status_str], map_row_to_media)
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  println!("retrieved {} elements for status: {}", media_list.len(), status);
  Ok(media_list)
}

#[tauri::command]
pub fn toggle_media_favorite(state: tauri::State<'_, DbState>, id: i32, is_favorite: bool) -> Result<(), String> {
  let conn = state.connection.lock().map_err(|_| "Failed to lock database")?;

  conn.execute(
    "UPDATE media SET favorite = ?1 WHERE id = ?2",
    [if is_favorite { 1 } else { 0 }, id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_media_status(state: tauri::State<'_, DbState>, id: i32, status: MediaStatus) -> Result<(), String> {
    let conn = state.connection.lock().map_err(|_| "Failed to lock database")?;

    conn.execute(
        "UPDATE media SET status = ?1 WHERE id = ?2",
        [status.to_string(), id.to_string()],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn update_media_notes(state: tauri::State<'_, DbState>, id: i32, notes: String) -> Result<(), String> {
  let conn = state.connection.lock().map_err(|_| "Failed to lock database")?;

  conn.execute(
    "UPDATE media SET notes = ?1 WHERE id = ?2",
    [notes, id.to_string()],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}
