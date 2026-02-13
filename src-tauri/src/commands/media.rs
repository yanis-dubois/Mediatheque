use crate::db::{DbState};
use crate::models::external_media::{ExternalMediaRequest};
use crate::models::media::{AnyMedia, Media, Movie, Series, TabletopGame};
use crate::models::enums::{CollectionMediaType, CollectionType, MediaOrderField, MediaStatus, MediaType};
use crate::models::query::{MediaFilter, MediaOrder};

// convert SQL TEXT -> Enums
pub fn match_media_type(s: &str) -> MediaType {
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
  })
}

/* -- GET media -- */

fn group_concat_to_vec(s: Option<String>) -> Vec<String> {
  s.map(|s| s.split(',').map(String::from).collect())
    .unwrap_or_default()
}

#[tauri::command]
pub fn get_media_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<AnyMedia, String> {
  println!("get_media_by_id");

  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  // retrieve data from Media
  let mut stmt = connection.prepare("SELECT * FROM media WHERE id = ?1")
    .map_err(|e| e.to_string())?;

  let base = stmt.query_row([&id], map_row_to_media)
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
        [&id],
        |row| {
          Ok(Movie {
            base,
            duration: row.get("duration")?,
            serie: row.get("serie")?,
            directors: group_concat_to_vec(row.get("directors")?),
            genre: group_concat_to_vec(row.get("genres")?),
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
        [&id],
        |row| {
          Ok(Series {
            base,
            seasons: row.get("seasons")?,
            episodes: row.get("episodes")?,
            creators: group_concat_to_vec(row.get("creators")?),
            genre: group_concat_to_vec(row.get("genres")?),
          })
        }
      ).map_err(|e| {
        let err_msg = format!("SQL error for series (ID {}): {}", id, e);
        println!("{}", err_msg);
        err_msg
      })?;

      Ok(AnyMedia::Series(series))
    },
    MediaType::TabletopGame => {
      let game = connection.query_row(
        "SELECT 
          tg.player_count, 
          tg.playing_time,
          (SELECT GROUP_CONCAT(p.name) FROM person p 
            JOIN tabletop_game_designer tgd ON p.id = tgd.designer_id 
            WHERE tgd.tabletop_game_id = tg.media_id) as designers,
          (SELECT GROUP_CONCAT(p.name) FROM person p 
            JOIN tabletop_game_artist tga ON p.id = tga.artist_id 
            WHERE tga.tabletop_game_id = tg.media_id) as artists,
          (SELECT GROUP_CONCAT(c.name) FROM company c 
            JOIN tabletop_game_publisher tgp ON c.id = tgp.publisher_id 
            WHERE tgp.tabletop_game_id = tg.media_id) as publishers,
          (SELECT GROUP_CONCAT(gm.name) FROM game_mechanic gm 
            JOIN tabletop_game_game_mechanic tggm ON gm.id = tggm.game_mechanic_id 
            WHERE tggm.tabletop_game_id = tg.media_id) as mechanics
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
        }
      ).map_err(|e| {
        let err_msg = format!("SQL error for tabletop_game (ID {}): {}", id, e);
        println!("{}", err_msg);
        err_msg
      })?;

      Ok(AnyMedia::TabletopGame(game))
    }
    // fallback : only base data
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
  // if collection has a specific type and is ordered by specific fields,
  // then we join the needed tables
  if let CollectionMediaType::Specific(media_type) = &collection_media_type {
    match media_type {
      MediaType::Movie => {
        join_clauses.push("LEFT JOIN movie mv ON m.id = mv.media_id".to_string());
        if order.iter().any(|o| o.field == MediaOrderField::Genre) {
          join_clauses.push(
            "LEFT JOIN (
              SELECT movie_id, MIN(g.name) as first_genre_name 
              FROM movie_genre mg 
              JOIN genre g ON mg.genre_id = g.id 
              GROUP BY movie_id
            ) g_sorted ON m.id = g_sorted.movie_id".to_string()
          );
        }
        if order.iter().any(|o| o.field == MediaOrderField::Directors) {
          join_clauses.push(
            "LEFT JOIN (
              SELECT movie_id, MIN(p.name) as first_person_name 
              FROM movie_director md 
              JOIN person p ON md.director_id = p.id 
              GROUP BY movie_id
            ) p_sorted ON m.id = p_sorted.movie_id".to_string()
          );
        }
      },
      MediaType::Series => {
        join_clauses.push("LEFT JOIN series s ON m.id = s.media_id".to_string());
        if order.iter().any(|o| o.field == MediaOrderField::Genre) {
          join_clauses.push(
            "LEFT JOIN (
              SELECT series_id, MIN(g.name) as first_genre_name 
              FROM series_genre sg 
              JOIN genre g ON sg.genre_id = g.id 
              GROUP BY series_id
            ) g_sorted ON m.id = g_sorted.series_id".to_string()
          );
        }
        if order.iter().any(|o| o.field == MediaOrderField::Creators) {
          join_clauses.push("LEFT JOIN series_creator sc ON m.id = sc.series_id LEFT JOIN person p ON sc.creator_id = p.id".to_string());
          join_clauses.push(
            "LEFT JOIN (
              SELECT series_id, MIN(p.name) as first_person_name 
              FROM series_creator sc
              JOIN person p ON sc.creator_id = p.id 
              GROUP BY series_id
            ) p_sorted ON m.id = p_sorted.series_id".to_string()
          );
        }
      },
      // no join by default
      _ => {}
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
  if let Some(q) = &filter.search_query {
    conditions.push("m.title LIKE ?".to_string());
    params.push(Box::new(format!("%{}%", q)));
  }
  // specific filters 
  // by Person (Movie, Series) TODO: add all other medias
  if let Some(person_name) = &filter.person {
    conditions.push(format!(
      "EXISTS (
        SELECT 1 FROM movie_director md JOIN person p ON md.director_id = p.id 
        WHERE md.movie_id = m.id AND p.name LIKE ?
        UNION
        SELECT 1 FROM series_creator sc JOIN person p ON sc.creator_id = p.id 
        WHERE sc.series_id = m.id AND p.name LIKE ?
      )"
    ));
    params.push(Box::new(format!("%{}%", person_name)));
    params.push(Box::new(format!("%{}%", person_name)));
  }
  // by Genre (Movie, Series)
  if let Some(genres) = &filter.genres {
    if !genres.is_empty() {
      // concatenate all genre
      let placeholders = genres.iter().map(|_| "?").collect::<Vec<_>>().join(",");

      conditions.push(format!(
        "EXISTS (
          SELECT 1 FROM movie_genre mg JOIN genre g ON mg.genre_id = g.id 
          WHERE mg.movie_id = m.id AND g.name IN ({})
          UNION
          SELECT 1 FROM series_genre sg JOIN genre g ON sg.genre_id = g.id 
          WHERE sg.series_id = m.id AND g.name IN ({})
        )", placeholders, placeholders
      ));

      for g in genres { params.push(Box::new(g.clone())); }
      for g in genres { params.push(Box::new(g.clone())); }
    }
  }
  // TODO [...]

  let where_clause = 
    if conditions.is_empty() { String::new() } 
    else { format!("WHERE {}", conditions.join(" AND ")) };
  let joins = join_clauses.join(" ");

  // --- ORDER BY ---
  let order_clause = 
    if order.is_empty() {
      if *collection_type == CollectionType::Manual {
        format!("ORDER BY cm.position ASC")
      }
      else {
        format!("ORDER BY title ASC")
      }
    }
    else {
    let mut parts = Vec::new();

    for o in order {
      let mapped_field: String = match (o.field, &collection_media_type) {
        // Movie specific field
        (MediaOrderField::Directors, CollectionMediaType::Specific(MediaType::Movie)) => "p_sorted.first_person_name".to_string(),
        (MediaOrderField::Genre, CollectionMediaType::Specific(MediaType::Movie)) => "g_sorted.first_genre_name".to_string(),
        (MediaOrderField::Serie, CollectionMediaType::Specific(MediaType::Movie)) => "mv.serie".to_string(),
        (MediaOrderField::Duration, CollectionMediaType::Specific(MediaType::Movie)) => "mv.duration".to_string(),

        // Series specific field
        (MediaOrderField::Creators, CollectionMediaType::Specific(MediaType::Series)) => "p_sorted.first_person_name".to_string(),
        (MediaOrderField::Genre, CollectionMediaType::Specific(MediaType::Series)) => "g_sorted.first_genre_name".to_string(),
        (MediaOrderField::Seasons, CollectionMediaType::Specific(MediaType::Series)) => "s.seasons".to_string(),
        (MediaOrderField::Episodes, CollectionMediaType::Specific(MediaType::Series)) => "s.episodes".to_string(),

        // Media generic field
        _ => format!("m.{}", o.field)
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

  let (joins, where_clause, order_clause, params) = build_media_query_parts(
    &collection_type, &collection_media_type, &filter, &order
  );

  let sql = 
    if collection_type == CollectionType::Manual {
      format!(
        "SELECT m.id, m.image_width, m.image_height FROM media m {} {} {}",
        joins, where_clause, order_clause
      )
    }
    else {
      format!(
        "SELECT DISTINCT m.id, m.image_width, m.image_height FROM media m {} {} {}",
        joins, where_clause, order_clause
      )
    };

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;
  let params_ref: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();

  let list = stmt.query_map(&params_ref[..], |row| {
    Ok((
      row.get(0)?,
      row.get(1)?,
      row.get(2)?,
    ))
  }).map_err(|e| e.to_string())?.collect::<rusqlite::Result<Vec<_>>>().map_err(|e| e.to_string())?;

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

  let list = stmt.query_map(rusqlite::params_from_iter(ids), map_row_to_media)
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  Ok(list)
}

/* -- UPDATE media -- */

#[tauri::command]
pub fn toggle_media_favorite(state: tauri::State<'_, DbState>, id: String, is_favorite: bool) -> Result<(), String> {
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  connection.execute(
    "UPDATE media SET favorite = ?1 WHERE id = ?2",
    [if is_favorite { "1" } else { "0" }, &id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_media_status(state: tauri::State<'_, DbState>, id: String, status: MediaStatus) -> Result<(), String> {
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  connection.execute(
    "UPDATE media SET status = ?1 WHERE id = ?2",
    [status.to_string(), id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_media_notes(state: tauri::State<'_, DbState>, id: String, notes: String) -> Result<(), String> {
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  connection.execute(
    "UPDATE media SET notes = ?1 WHERE id = ?2",
    [notes, id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

/* ADD media */

use std::fs;
use rusqlite::{Transaction, params};
use tauri::{Manager};

pub fn insert_external_media(
  tx: &Transaction, 
  data: ExternalMediaRequest, 
  media_uuid: &str, 
  image_width: u32, 
  image_height: u32
) -> Result<(), rusqlite::Error> {
  println!("insert_external_media");

  let base = data.base();
  let added_date = chrono::Utc::now().to_rfc3339();

  // insert into Media
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
      "TO_DISCOVER", // default status
      false, // default favorite
      "", // default notes
      // width,
      // height
    ],
  )?;

  // Insert into specific media_type
  match data {
    ExternalMediaRequest::Movie(m) => {
      tx.execute(
        "INSERT INTO movie (media_id, duration, serie) VALUES (?1, ?2, ?3)",
        params![media_uuid, m.duration, m.serie],
      )?;

      for genre_name in m.genre {
        tx.execute("INSERT OR IGNORE INTO genre (name) VALUES (?1)", [genre_name.clone()])?;
        tx.execute("INSERT INTO movie_genre (movie_id, genre_id) SELECT ?1, id FROM genre WHERE name = ?2", params![media_uuid, genre_name])?;
      }

      for director_name in m.directors {
        tx.execute("INSERT OR IGNORE INTO person (name) VALUES (?1)", [director_name.clone()])?;
        tx.execute("INSERT INTO movie_director (movie_id, director_id) SELECT ?1, id FROM person WHERE name = ?2", params![media_uuid, director_name])?;
      }
    },
    // TODO add other media types
    _ => {} 
  }

  println!("Insert of data finished !");
  Ok(())
}

#[tauri::command]
pub async fn add_media_to_library(app: tauri::AppHandle, data: ExternalMediaRequest) -> Result<(), String> {
  println!("add_media_to_library");

  // 1. Extraire les infos communes et spécifiques selon le type
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
    insert_external_media(&tx, data, &media_uuid, image_size.width as u32, image_size.height as u32)
      .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
  }

  Ok(())
}
