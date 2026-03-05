use crate::db::DbState;
use crate::models::enums::{
  match_media_status, match_media_type, CollectionMediaType, CollectionType, MediaOrderField,
  MediaStatus, MediaType,
};
use crate::models::external_media::ExternalMediaRequest;
use crate::models::media::{AnyMedia, Media, Movie, Series, TabletopGame};
use crate::models::query::{MediaFilter, MediaOrder};

// convert SQL -> Media
pub fn map_row_to_media(row: &rusqlite::Row) -> rusqlite::Result<Media> {
  // data that has to be transformed
  let type_str: String = row.get(1)?;
  let status_str: String = row.get(8)?;
  let fav_int: i32 = row.get(9)?;

  Ok(Media {
    id: row.get(0)?,
    media_type: match_media_type(&type_str),
    image_width: row.get(2)?,
    image_height: row.get(3)?,
    title: row.get(4)?,
    description: row.get(5)?,
    release_date: row.get(6)?,
    added_date: row.get(7)?,
    status: match_media_status(&status_str),
    favorite: fav_int == 1, // 0/1 -> bool
    notes: row.get(10)?,
    score: row.get(11)?,
  })
}

/* -- GET media -- */

fn group_concat_to_vec(s: Option<String>) -> Vec<String> {
  s.map(|s| s.split(',').map(String::from).collect())
    .unwrap_or_default()
}

#[tauri::command]
pub fn get_media_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<AnyMedia, String> {
  println!("get_media_by_id for ID: {}", id);

  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  // 1. Récupération des données de base
  let mut stmt = connection
    .prepare("SELECT * FROM media WHERE id = ?1")
    .map_err(|e| e.to_string())?;

  let base = stmt
    .query_row([&id], map_row_to_media)
    .map_err(|e| e.to_string())?;

  // 2. Récupération des données spécifiques selon le type
  match base.media_type {
    MediaType::Movie => {
      let movie = connection
        .query_row(
          "SELECT m.duration, m.serie,
            (SELECT GROUP_CONCAT(p.name) FROM person p 
              JOIN media_person mp ON p.id = mp.person_id 
              WHERE mp.media_id = ?1 AND mp.role = 'DIRECTOR') as directors,
            (SELECT GROUP_CONCAT(g.name) FROM genre g 
              JOIN media_genre mg ON g.id = mg.genre_id 
              WHERE mg.media_id = ?1) as genres
            FROM movie m WHERE m.media_id = ?1",
          [&id],
          |row| {
            Ok(Movie {
              base,
              duration: row.get("duration")?,
              serie: row.get("serie")?,
              directors: group_concat_to_vec(row.get("directors")?),
              genre: group_concat_to_vec(row.get("genres")?),
            })
          },
        )
        .map_err(|e| e.to_string())?;

      Ok(AnyMedia::Movie(movie))
    }

    MediaType::Series => {
      let series = connection
        .query_row(
          "SELECT s.seasons, s.episodes,
            (SELECT GROUP_CONCAT(p.name) FROM person p 
              JOIN media_person mp ON p.id = mp.person_id 
              WHERE mp.media_id = ?1 AND mp.role = 'CREATOR') as creators,
            (SELECT GROUP_CONCAT(g.name) FROM genre g 
              JOIN media_genre mg ON g.id = mg.genre_id 
              WHERE mg.media_id = ?1) as genres
            FROM series s WHERE s.media_id = ?1",
          [&id],
          |row| {
            Ok(Series {
              base,
              seasons: row.get("seasons")?,
              episodes: row.get("episodes")?,
              creators: group_concat_to_vec(row.get("creators")?),
              genre: group_concat_to_vec(row.get("genres")?),
            })
          },
        )
        .map_err(|e| e.to_string())?;

      Ok(AnyMedia::Series(series))
    }

    MediaType::TabletopGame => {
      let game = connection
        .query_row(
          "SELECT tg.player_count, tg.playing_time,
            (SELECT GROUP_CONCAT(p.name) FROM person p 
              JOIN media_person mp ON p.id = mp.person_id 
              WHERE mp.media_id = ?1 AND mp.role = 'DESIGNER') as designers,
            (SELECT GROUP_CONCAT(p.name) FROM person p 
              JOIN media_person mp ON p.id = mp.person_id 
              WHERE mp.media_id = ?1 AND mp.role = 'ARTIST') as artists,
            (SELECT GROUP_CONCAT(c.name) FROM company c 
              JOIN media_company mc ON c.id = mc.company_id 
              WHERE mc.media_id = ?1 AND mc.role = 'PUBLISHER') as publishers,
            (SELECT GROUP_CONCAT(gm.name) FROM game_mechanic gm 
              JOIN media_game_mechanic mgm ON gm.id = mgm.game_mechanic_id 
              WHERE mgm.media_id = ?1) as mechanics
            FROM tabletop_game tg WHERE tg.media_id = ?1",
          [&id],
          |row| {
            Ok(TabletopGame {
              base,
              player_count: row.get("player_count")?,
              playing_time: row.get("playing_time")?,
              designers: group_concat_to_vec(row.get("designers")?),
              artists: group_concat_to_vec(row.get("artists")?),
              publishers: group_concat_to_vec(row.get("publishers")?),
              game_mechanics: group_concat_to_vec(row.get("mechanics")?),
            })
          },
        )
        .map_err(|e| e.to_string())?;

      Ok(AnyMedia::TabletopGame(game))
    }

    _ => Ok(AnyMedia::Base(base)),
  }
}

/* -- GET collection -- */

fn build_media_query_parts(
  collection_type: &CollectionType,
  collection_media_type: &CollectionMediaType,
  filter: &MediaFilter,
  order: &Vec<MediaOrder>,
) -> (String, String, String, Vec<Box<dyn rusqlite::ToSql>>) {
  let mut conditions = Vec::new();
  let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
  let mut join_clauses = Vec::new();

  // --- JOIN ---
  if let CollectionMediaType::Specific(media_type) = &collection_media_type {
    // JOIN on media details
    match media_type {
      MediaType::Movie => join_clauses.push("LEFT JOIN movie mv ON m.id = mv.media_id".to_string()),
      MediaType::Series => join_clauses.push("LEFT JOIN series s ON m.id = s.media_id".to_string()),
      MediaType::TabletopGame => {
        join_clauses.push("LEFT JOIN tabletop_game tg ON m.id = tg.media_id".to_string())
      }
      _ => {}
    }

    // add join for specific order
    for o in order {
      match o.field {
        // JOIN on person
        MediaOrderField::Directors
        | MediaOrderField::Creators
        | MediaOrderField::Designers
        | MediaOrderField::Artists => {
          let role = match o.field {
            MediaOrderField::Directors => "DIRECTOR",
            MediaOrderField::Creators => "CREATOR",
            MediaOrderField::Designers => "DESIGNER",
            MediaOrderField::Artists => "ARTIST",
            _ => unreachable!(),
          };

          // create alias on the role
          join_clauses.push(format!(
            "LEFT JOIN (
              SELECT mp.media_id, MIN(p.name) as name 
              FROM media_person mp 
              JOIN person p ON mp.person_id = p.id 
              WHERE mp.role = '{}'
              GROUP BY mp.media_id
            ) p_sorted_{} ON m.id = p_sorted_{}.media_id",
            role, role, role
          ));
        }

        // JOIN on genre
        MediaOrderField::Genre => {
          join_clauses.push(
            "LEFT JOIN (
              SELECT mg.media_id, MIN(g.name) as name 
              FROM media_genre mg 
              JOIN genre g ON mg.genre_id = g.id 
              GROUP BY mg.media_id
            ) g_sorted ON m.id = g_sorted.media_id"
              .to_string(),
          );
        }

        // JOIN on game_mechanic
        MediaOrderField::GameMechanic => {
          join_clauses.push(
            "LEFT JOIN (
              SELECT mgm.media_id, MIN(gm.name) as name 
              FROM media_game_mechanic mgm 
              JOIN game_mechanic gm ON mgm.game_mechanic_id = gm.id 
              GROUP BY mgm.media_id
            ) g_sorted ON m.id = g_sorted.media_id"
              .to_string(),
          );
        }

        _ => {}
      }
    }
  }

  // --- WHERE ---
  // for manual collection
  if let Some(col_id) = &filter.collection_id {
    join_clauses.push("INNER JOIN collection_media cm ON m.id = cm.media_id".to_string());
    conditions.push("cm.collection_id = ?".to_string());
    params.push(Box::new(col_id.clone()));
  }
  // generic filter
  if let Some(t) = &filter.media_type {
    conditions.push("m.media_type = ?".to_string());
    params.push(Box::new(t.to_string()));
  }
  if let Some(s) = &filter.status {
    conditions.push("m.status = ?".to_string());
    params.push(Box::new(s.to_string()));
  }
  if let Some(true) = &filter.favorite_only {
    conditions.push("m.favorite = 1".to_string());
  }
  if let Some(t) = &filter.title {
    conditions.push("m.title LIKE ?".to_string());
    params.push(Box::new(format!("%{}%", t)));
  }
  // search on every text field
  if let Some(q) = &filter.search_query {
    let pattern = format!("%{}%", q);
    let mut search_conditions = Vec::new();

    // generic fields
    search_conditions.push("m.title LIKE ?".to_string());
    search_conditions.push("m.description LIKE ?".to_string());
    search_conditions.push("m.notes LIKE ?".to_string());
    for _ in 0..3 {
      params.push(Box::new(pattern.clone()));
    }

    // person
    search_conditions.push(
      "EXISTS (
        SELECT 1 FROM media_person mp 
        JOIN person p ON mp.person_id = p.id 
        WHERE mp.media_id = m.id AND p.name LIKE ?
      )"
      .to_string(),
    );
    params.push(Box::new(pattern.clone()));

    // genre
    search_conditions.push(
      "EXISTS (
        SELECT 1 FROM media_genre mg 
        JOIN genre g ON mg.genre_id = g.id 
        WHERE mg.media_id = m.id AND g.name LIKE ?
      )"
      .to_string(),
    );
    params.push(Box::new(pattern.clone()));

    // company
    search_conditions.push(
      "EXISTS (
        SELECT 1 FROM media_company mc 
        JOIN company c ON mc.company_id = c.id 
        WHERE mc.media_id = m.id AND c.name LIKE ?
      )"
      .to_string(),
    );
    params.push(Box::new(pattern.clone()));

    // game mechanic
    search_conditions.push(
      "EXISTS (
        SELECT 1 FROM media_game_mechanic mgm
        JOIN game_mechanic gm ON mgm.game_mechanic_id = gm.id 
        WHERE mgm.media_id = m.id AND gm.name LIKE ?
      )"
      .to_string(),
    );
    params.push(Box::new(pattern.clone()));

    // group everything together
    let final_search_clause = format!("({})", search_conditions.join(" OR "));
    conditions.push(final_search_clause);
  }
  // specific filters
  // by Person
  if let Some(person_name) = &filter.person {
    conditions.push(
      "EXISTS (
        SELECT 1 FROM media_person mp 
        JOIN person p ON mp.person_id = p.id 
        WHERE mp.media_id = m.id AND p.name LIKE ?
      )"
      .to_string(),
    );
    params.push(Box::new(format!("%{}%", person_name)));
  }
  // by Genre
  if let Some(genres) = &filter.genres {
    if !genres.is_empty() {
      let placeholders = genres.iter().map(|_| "?").collect::<Vec<_>>().join(",");
      conditions.push(format!(
        "EXISTS (
          SELECT 1 FROM media_genre mg 
          JOIN genre g ON mg.genre_id = g.id 
          WHERE mg.media_id = m.id AND g.name IN ({})
        )",
        placeholders
      ));
      for g in genres {
        params.push(Box::new(g.clone()));
      }
    }
  }
  // TODO [...]
  // metadata collection
  // Person
  if let Some(p_id) = &filter.person_id {
    conditions.push(
      "EXISTS (SELECT 1 FROM media_person mp WHERE mp.media_id = m.id AND mp.person_id = ?)"
        .to_string(),
    );
    params.push(Box::new(*p_id));
  }
  // Company
  if let Some(c_id) = &filter.company_id {
    conditions.push(
      "EXISTS (SELECT 1 FROM media_company mc WHERE mc.media_id = m.id AND mc.company_id = ?)"
        .to_string(),
    );
    params.push(Box::new(*c_id));
  }
  // Genre
  if let Some(g_id) = &filter.genre_id {
    conditions.push(
      "EXISTS (SELECT 1 FROM media_genre mg WHERE mg.media_id = m.id AND mg.genre_id = ?)"
        .to_string(),
    );
    params.push(Box::new(*g_id));
  }
  // Game Mechanic
  if let Some(gm_id) = &filter.game_mechanic_id {
    conditions.push(
      "EXISTS (SELECT 1 FROM media_game_mechanic mgm WHERE mgm.media_id = m.id AND mgm.game_mechanic_id = ?)".to_string()
    );
    params.push(Box::new(*gm_id));
  }

  let where_clause = if conditions.is_empty() {
    String::new()
  } else {
    format!("WHERE {}", conditions.join(" AND "))
  };
  let joins = join_clauses.join(" ");

  // --- ORDER BY ---
  let order_clause = if order.is_empty() {
    if *collection_type == CollectionType::Manual {
      "ORDER BY cm.position ASC".to_string()
    } else {
      "ORDER BY title COLLATE NOCASE ASC".to_string()
    }
  } else {
    let mut parts = Vec::new();

    for o in order {
      let mapped_field: String = match o.field {
        // Specific Field
        MediaOrderField::Directors => "p_sorted_DIRECTOR.name".to_string(),
        MediaOrderField::Creators => "p_sorted_CREATOR.name".to_string(),
        MediaOrderField::Designers => "p_sorted_DESIGNER.name".to_string(),
        MediaOrderField::Artists => "p_sorted_ARTIST.name".to_string(),
        MediaOrderField::Genre => "g_sorted.name".to_string(),
        MediaOrderField::Serie => "mv.serie".to_string(),
        MediaOrderField::Duration => "mv.duration".to_string(),
        MediaOrderField::Seasons => "s.seasons".to_string(),
        MediaOrderField::Episodes => "s.episodes".to_string(),
        MediaOrderField::PlayerCount => "tg.player_count".to_string(),

        // Generic field
        _ => format!("m.{}", o.field),
      };

      parts.push(format!("{} {}", mapped_field, o.direction));
    }

    format!("ORDER BY {}", parts.join(", "))
  };

  (joins, where_clause, order_clause, params)
}

#[tauri::command]
pub fn get_media_layout_list(
  state: tauri::State<'_, DbState>,
  collection_type: CollectionType,
  collection_media_type: CollectionMediaType,
  filter: MediaFilter,
  order: Vec<MediaOrder>,
) -> Result<Vec<(String, u16, u16)>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock error")?;

  let (joins, where_clause, order_clause, params) =
    build_media_query_parts(&collection_type, &collection_media_type, &filter, &order);

  let sql = if collection_type == CollectionType::Manual {
    format!(
      "SELECT m.id, m.image_width, m.image_height FROM media m {} {} {}",
      joins, where_clause, order_clause
    )
  } else {
    format!(
      "SELECT DISTINCT m.id, m.image_width, m.image_height FROM media m {} {} {}",
      joins, where_clause, order_clause
    )
  };

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;
  let params_ref: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

  let list = stmt
    .query_map(&params_ref[..], |row| {
      Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    })
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  Ok(list)
}

#[tauri::command]
pub fn get_media_batch(
  state: tauri::State<'_, DbState>,
  ids: Vec<String>,
) -> Result<Vec<Media>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;

  let placeholders: String = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
  let sql = format!("SELECT * FROM media WHERE id IN ({})", placeholders);

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;

  let list = stmt
    .query_map(rusqlite::params_from_iter(ids), map_row_to_media)
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  Ok(list)
}

/* -- UPDATE media -- */

#[tauri::command]
pub fn toggle_media_favorite(
  state: tauri::State<'_, DbState>,
  id: String,
  is_favorite: bool,
) -> Result<(), String> {
  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  connection
    .execute(
      "UPDATE media SET favorite = ?1 WHERE id = ?2",
      [if is_favorite { "1" } else { "0" }, &id],
    )
    .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_media_status(
  state: tauri::State<'_, DbState>,
  id: String,
  status: MediaStatus,
) -> Result<(), String> {
  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  connection
    .execute(
      "UPDATE media SET status = ?1 WHERE id = ?2",
      [status.to_string(), id],
    )
    .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_media_notes(
  state: tauri::State<'_, DbState>,
  id: String,
  notes: String,
) -> Result<(), String> {
  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  connection
    .execute("UPDATE media SET notes = ?1 WHERE id = ?2", [notes, id])
    .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_media_score(
  state: tauri::State<'_, DbState>,
  id: String,
  score: Option<u32>,
) -> Result<(), String> {
  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  connection
    .execute(
      "UPDATE media SET score = ?1 WHERE id = ?2",
      params![score, id],
    )
    .map_err(|e| e.to_string())?;

  Ok(())
}

/* ADD media */

use rusqlite::{params, Transaction};
use std::fs;
use tauri::Manager;

pub fn insert_external_media(
  tx: &Transaction,
  data: ExternalMediaRequest,
  media_uuid: &str,
  image_width: u32,
  image_height: u32,
) -> Result<(), rusqlite::Error> {
  println!("insert_external_media: {}", media_uuid);

  let base = data.base();
  let added_date = chrono::Utc::now().to_rfc3339();

  // insert in parent media table
  tx.execute(
    "INSERT INTO media (id, media_type, image_width, image_height, title, description, release_date, added_date, status, favorite, notes)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
    params![
      media_uuid,
      base.media_type.to_string(),
      image_width,
      image_height,
      base.title,
      base.description,
      base.release_date,
      added_date,
      "TO_DISCOVER",
      false,
      "",
    ],
  )?;

  // insert details
  match data {
    ExternalMediaRequest::Movie(m) => {
      tx.execute(
        "INSERT INTO movie (media_id, duration, serie) VALUES (?1, ?2, ?3)",
        params![media_uuid, m.duration, m.serie],
      )?;
      insert_relations_person(tx, media_uuid, m.directors, "DIRECTOR")?;
      insert_relations_genre(tx, media_uuid, m.genre)?;
    }

    ExternalMediaRequest::Series(s) => {
      tx.execute(
        "INSERT INTO series (media_id, seasons, episodes) VALUES (?1, ?2, ?3)",
        params![media_uuid, s.seasons, s.episodes],
      )?;
      insert_relations_person(tx, media_uuid, s.creators, "CREATOR")?;
      insert_relations_genre(tx, media_uuid, s.genre)?;
    }

    ExternalMediaRequest::TabletopGame(tg) => {
      tx.execute(
        "INSERT INTO tabletop_game (media_id, player_count, playing_time) VALUES (?1, ?2, ?3)",
        params![media_uuid, tg.player_count, tg.playing_time],
      )?;
      insert_relations_person(tx, media_uuid, tg.designers, "DESIGNER")?;
      insert_relations_person(tx, media_uuid, tg.artists, "ARTIST")?;
      insert_relations_company(tx, media_uuid, tg.publishers, "PUBLISHER")?;
      insert_game_mechanic(tx, media_uuid, tg.game_mechanics)?;
    }
  }

  Ok(())
}

fn insert_relations_person(
  tx: &Transaction,
  media_id: &str,
  names: Vec<String>,
  role: &str,
) -> Result<(), rusqlite::Error> {
  for name in names {
    tx.execute("INSERT OR IGNORE INTO person (name) VALUES (?1)", [&name])?;
    tx.execute(
      "INSERT INTO media_person (media_id, person_id, role) 
      SELECT ?1, id, ?3 FROM person WHERE name = ?2",
      params![media_id, name, role],
    )?;
  }
  Ok(())
}
fn insert_relations_genre(
  tx: &Transaction,
  media_id: &str,
  genres: Vec<String>,
) -> Result<(), rusqlite::Error> {
  for genre in genres {
    tx.execute("INSERT OR IGNORE INTO genre (name) VALUES (?1)", [&genre])?;
    tx.execute(
      "INSERT INTO media_genre (media_id, genre_id) 
      SELECT ?1, id FROM genre WHERE name = ?2",
      params![media_id, genre],
    )?;
  }
  Ok(())
}
fn insert_relations_company(
  tx: &Transaction,
  media_id: &str,
  names: Vec<String>,
  role: &str,
) -> Result<(), rusqlite::Error> {
  for name in names {
    tx.execute("INSERT OR IGNORE INTO company (name) VALUES (?1)", [&name])?;
    tx.execute(
      "INSERT INTO media_company (media_id, company_id, role) 
      SELECT ?1, id, ?3 FROM company WHERE name = ?2",
      params![media_id, name, role],
    )?;
  }
  Ok(())
}
fn insert_game_mechanic(
  tx: &Transaction,
  media_id: &str,
  game_mechanics: Vec<String>,
) -> Result<(), rusqlite::Error> {
  for mechanic in game_mechanics {
    tx.execute(
      "INSERT OR IGNORE INTO game_mechanic (name) VALUES (?1)",
      [&mechanic],
    )?;
    tx.execute(
      "INSERT INTO media_game_mechanic (media_id, game_mechanic_id) 
      SELECT ?1, id FROM game_mechanic WHERE name = ?2",
      params![media_id, mechanic],
    )?;
  }
  Ok(())
}

#[tauri::command]
pub async fn add_media_to_library(
  app: tauri::AppHandle,
  data: ExternalMediaRequest,
) -> Result<(), String> {
  println!("add_media_to_library");

  // extract basic infos
  let base = data.base();
  let image_url = &base.image_url;

  // download media image
  let response = reqwest::get(image_url).await.map_err(|e| e.to_string())?;
  let bytes = response.bytes().await.map_err(|e| e.to_string())?;

  {
    // get path to app local file
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let posters_dir = app_dir.join("posters");
    fs::create_dir_all(&posters_dir).map_err(|e| e.to_string())?;

    // generate uuid
    let media_uuid = uuid::Uuid::new_v4().to_string();

    // store image in local file
    let file_name = format!("{}.jpg", media_uuid);
    let file_path = posters_dir.join(&file_name);
    std::fs::write(&file_path, &bytes).map_err(|e| e.to_string())?;

    // get image dimensions
    let image_size = imagesize::size(&file_path).map_err(|e| e.to_string())?;

    // DB connection
    let state = app.state::<DbState>();
    let mut connection = state.connection.lock().unwrap();
    let tx = connection.transaction().map_err(|e| e.to_string())?;

    // INSERT media
    insert_external_media(
      &tx,
      data,
      &media_uuid,
      image_size.width as u32,
      image_size.height as u32,
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
  }

  Ok(())
}
