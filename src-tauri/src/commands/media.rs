use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::db::DbState;
use crate::models::enums::{
  match_media_status, match_media_type, match_tag_type, CollectionMediaType, CollectionType,
  MediaOrderField, MediaStatus, MediaType, TagType,
};
use crate::models::media::{
  ApiEntityRelation, ApiMedia, LibraryEntityRelation, LibraryMedia, LibraryMediaRelations,
  LibraryState, MediaBase, MediaData, MediaExtension,
};
use crate::models::metadata::Tag;
use crate::models::query::{MediaFilter, MediaOrder};

// convert SQL -> Media
pub fn map_row_to_media(row: &rusqlite::Row) -> rusqlite::Result<LibraryMedia> {
  let type_str: String = row.get(2)?;
  let media_type = match_media_type(&type_str);

  // build base
  let base = MediaBase {
    media_type: media_type.clone(),
    title: row.get(5)?,
    description: row.get(6)?,
    release_date: row.get(7)?,
  };

  // build state
  let state = LibraryState {
    id: row.get(0)?,
    external_id: row.get(1)?,
    added_date: row.get(8)?,
    status: match_media_status(&row.get::<_, String>(9)?),
    favorite: row.get::<_, i32>(10)? == 1,
    notes: row.get(11)?,
    score: row.get(12)?,
    has_poster: row.get::<_, i32>(13)? == 1,
    has_backdrop: row.get::<_, i32>(14)? == 1,
    poster_width: row.get(3)?,
    poster_height: row.get(4)?,
  };

  // init extension
  let extension = MediaExtension::None;

  Ok(LibraryMedia {
    data: MediaData { base, extension },
    state,
    relations: LibraryMediaRelations {
      persons: HashMap::new(),
      cast: HashMap::new(),
      companies: HashMap::new(),
      tags: HashMap::new(),
    },
  })
}

/* -- GET media -- */

pub fn fill_media_relations(
  connection: &rusqlite::Connection,
  media: &mut LibraryMedia,
) -> Result<(), String> {
  let media_id = &media.state.id;

  // retrieve tags
  let mut stmt_tags = connection
    .prepare(
      "SELECT CAST(t.id AS TEXT), t.name, mt.type 
        FROM tag t 
        JOIN media_tag mt ON t.id = mt.tag_id 
        WHERE mt.media_id = ?1",
    )
    .map_err(|e| e.to_string())?;

  let tag_rows = stmt_tags
    .query_map([media_id], |row| {
      Ok((
        row.get::<_, String>(0)?,
        row.get::<_, String>(1)?,
        row.get::<_, String>(2)?,
      ))
    })
    .map_err(|e| e.to_string())?;

  for row in tag_rows.flatten() {
    let (id, name, type_str) = row;
    let tag_type = match_tag_type(&type_str);

    media
      .relations
      .tags
      .entry(tag_type)
      .or_insert_with(Vec::new)
      .push(Tag { id, name });
  }

  // retrieve persons
  let mut stmt_pers = connection
    .prepare(
      "SELECT CAST(p.id AS TEXT), p.name, mp.role, mp.category, mp.sort_order 
        FROM person p 
        JOIN media_person mp ON p.id = mp.person_id 
        WHERE mp.media_id = ?1
        ORDER BY mp.sort_order ASC",
    )
    .map_err(|e| e.to_string())?;

  let pers_rows = stmt_pers
    .query_map([media_id], |row| {
      Ok((
        row.get::<_, String>(0)?,
        row.get::<_, String>(1)?,
        row.get::<_, String>(2)?,
        row.get::<_, String>(3)?,
        row.get::<_, u32>(4)?,
      ))
    })
    .map_err(|e| e.to_string())?;

  for row in pers_rows.flatten() {
    let (id, name, role, category, order) = row;

    let target_map = if category == "cast" {
      &mut media.relations.cast
    } else {
      &mut media.relations.persons
    };

    let relation = target_map
      .entry(name)
      .or_insert_with(|| LibraryEntityRelation {
        id,
        order: Some(order),
        values: Vec::new(),
      });
    relation.values.push(role);
  }

  // retrieve companies
  let mut stmt_comp = connection
    .prepare(
      "SELECT CAST(c.id AS TEXT), c.name, mc.role, mc.sort_order
        FROM company c 
        JOIN media_company mc ON c.id = mc.company_id 
        WHERE mc.media_id = ?1
        ORDER BY mc.sort_order ASC",
    )
    .map_err(|e| e.to_string())?;

  let comp_rows = stmt_comp
    .query_map([media_id], |row| {
      Ok((
        row.get::<_, String>(0)?,
        row.get::<_, String>(1)?,
        row.get::<_, String>(2)?,
        row.get::<_, u32>(3)?,
      ))
    })
    .map_err(|e| e.to_string())?;

  for row in comp_rows.flatten() {
    let (id, name, role, order) = row;

    let relation = media
      .relations
      .companies
      .entry(name)
      .or_insert_with(|| LibraryEntityRelation {
        id,
        order: Some(order),
        values: Vec::new(),
      });
    relation.values.push(role);
  }

  Ok(())
}

pub fn fill_media_extension(
  connection: &Connection,
  media: &mut LibraryMedia,
) -> Result<(), String> {
  let media_id = &media.state.id;

  match media.data.base.media_type {
    MediaType::Movie => {
      let duration: i32 = connection
        .query_row(
          "SELECT duration FROM movie WHERE media_id = ?1",
          [media_id],
          |row| row.get(0),
        )
        .unwrap_or(0);
      media.data.extension = MediaExtension::Movie { duration };
    }
    MediaType::Series => {
      let (seasons, episodes): (i32, i32) = connection
        .query_row(
          "SELECT seasons, episodes FROM series WHERE media_id = ?1",
          [media_id],
          |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or((0, 0));
      media.data.extension = MediaExtension::Series { seasons, episodes };
    }
    MediaType::TabletopGame => {
      let (player_count, playing_time): (String, String) = connection
        .query_row(
          "SELECT player_count, playing_time FROM tabletop_game WHERE media_id = ?1",
          [media_id],
          |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .unwrap_or(("".to_string(), "".to_string()));
      media.data.extension = MediaExtension::Game {
        player_count,
        playing_time,
      };
    }
    _ => media.data.extension = MediaExtension::None,
  }

  Ok(())
}

#[tauri::command]
pub fn get_media_by_id(state: tauri::State<'_, DbState>, id: &str) -> Result<LibraryMedia, String> {
  println!("get_media_by_id for ID: {}", id);

  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  let mut stmt = connection
    .prepare("SELECT * FROM media WHERE id = ?1")
    .map_err(|e| e.to_string())?;

  let mut media = stmt
    .query_row([id], map_row_to_media)
    .map_err(|e| e.to_string())?;

  fill_media_relations(&connection, &mut media)?;
  fill_media_extension(&connection, &mut media)?;

  Ok(media)
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
        MediaOrderField::Director
        | MediaOrderField::Creator
        | MediaOrderField::Designer
        | MediaOrderField::Artist => {
          let role = o.field.to_string();

          // create alias on the person role
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

        // JOIN on company
        MediaOrderField::Publisher => {
          let role = o.field.to_string();

          // create alias on the company role
          join_clauses.push(format!(
            "LEFT JOIN (
              SELECT mc.media_id, MIN(c.name) as name 
              FROM media_company mc 
              JOIN company c ON mc.company_id = c.id 
              WHERE mc.role = '{}'
              GROUP BY mc.media_id
            ) c_sorted_{} ON m.id = c_sorted_{}.media_id",
            role, role, role
          ));
        }

        // JOIN on tag
        MediaOrderField::Genre | MediaOrderField::Saga | MediaOrderField::GameMechanic => {
          let tag_type = o.field.to_string();

          // create alias on the tag type
          join_clauses.push(format!(
            "LEFT JOIN (
              SELECT mt.media_id, MIN(t.name) as name 
              FROM media_tag mt 
              JOIN tag t ON mt.tag_id = t.id 
              WHERE mt.type = '{}'
              GROUP BY mt.media_id
            ) t_sorted_{} ON m.id = t_sorted_{}.media_id",
            tag_type, tag_type, tag_type
          ));
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

    // tag
    search_conditions.push(
      "EXISTS (
        SELECT 1 FROM media_tag mt 
        JOIN tag t ON mt.tag_id = t.id 
        WHERE mt.media_id = m.id AND t.name LIKE ?
      )"
      .to_string(),
    );
    params.push(Box::new(pattern.clone()));

    // group everything together
    let final_search_clause = format!("({})", search_conditions.join(" OR "));
    conditions.push(final_search_clause);
  }
  // specific filters
  // by person
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
  // by person
  if let Some(company_name) = &filter.company {
    conditions.push(
      "EXISTS (
        SELECT 1 FROM media_company mc 
        JOIN company c ON mc.company_id = c.id 
        WHERE mc.media_id = m.id AND c.name LIKE ?
      )"
      .to_string(),
    );
    params.push(Box::new(format!("%{}%", company_name)));
  }
  // by tag
  if let Some(tag) = &filter.tag {
    let tag_type = &tag.0;
    let tag_name = &tag.1;
    conditions.push(format!(
      "EXISTS (
        SELECT 1 FROM media_tag mt 
        JOIN tag t ON mt.tag_id = t.id 
        WHERE mt.media_id = m.id AND mt.type = '{}' AND t.name LIKE ?
      )",
      tag_type.to_string()
    ));
    params.push(Box::new(format!("%{}%", tag_name)));
  }
  // TODO [...]
  // metadata collection
  // person
  if let Some(p_id) = &filter.person_id {
    conditions.push(
      "EXISTS (
        SELECT 1 FROM media_person mp 
        WHERE mp.media_id = m.id AND mp.person_id = ?
      )"
      .to_string(),
    );
    params.push(Box::new(*p_id));
  }
  // company
  if let Some(c_id) = &filter.company_id {
    conditions.push(
      "EXISTS (
        SELECT 1 FROM media_company mc 
        WHERE mc.media_id = m.id AND mc.company_id = ?
      )"
      .to_string(),
    );
    params.push(Box::new(*c_id));
  }
  // tag
  for (id_opt, tag_type) in [
    (&filter.genre_id, "GENRE"),
    (&filter.saga_id, "SAGA"),
    (&filter.game_mechanic_id, "GAME_MECHANIC"),
  ] {
    if let Some(id) = id_opt {
      conditions.push(format!(
        "EXISTS (
          SELECT 1 FROM media_tag mt 
          WHERE mt.media_id = m.id AND mt.tag_id = ? AND mt.type = '{}'
        )",
        tag_type
      ));
      params.push(Box::new(*id));
    }
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
        // status : custom order
        MediaOrderField::Status => "CASE m.status 
            WHEN 'FINISHED' THEN 1 
            WHEN 'IN_PROGRESS' THEN 2 
            WHEN 'TO_DISCOVER' THEN 3 
            WHEN 'DROPPED' THEN 4 
            ELSE 5 
            END"
          .to_string(),

        // specific field
        MediaOrderField::Director => "p_sorted_DIRECTOR.name".to_string(),
        MediaOrderField::Creator => "p_sorted_CREATOR.name".to_string(),
        MediaOrderField::Designer => "p_sorted_DESIGNER.name".to_string(),
        MediaOrderField::Artist => "p_sorted_ARTIST.name".to_string(),
        MediaOrderField::Genre => "t_sorted_GENRE.name".to_string(),
        MediaOrderField::Saga => "t_sorted_SAGA.name".to_string(),
        MediaOrderField::GameMechanic => "t_sorted_GAME_MECHANIC.name".to_string(),
        MediaOrderField::Duration => "mv.duration".to_string(),
        MediaOrderField::Seasons => "s.seasons".to_string(),
        MediaOrderField::Episodes => "s.episodes".to_string(),
        MediaOrderField::PlayerCount => "tg.player_count".to_string(),

        // generic field
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
      "SELECT m.id, m.poster_width, m.poster_height FROM media m {} {} {}",
      joins, where_clause, order_clause
    )
  } else {
    format!(
      "SELECT DISTINCT m.id, m.poster_width, m.poster_height FROM media m {} {} {}",
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
) -> Result<Vec<LibraryMedia>, String> {
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

  if notes.len() > 5000 {
    return Err("Notes exceeds the 5,000 character limit".to_string());
  }

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

pub struct DownloadedMediaAssets {
  pub poster_width: u32,
  pub poster_height: u32,
  pub has_poster: bool,
  pub has_backdrop: bool,
}

pub async fn download_assets(
  app: &tauri::AppHandle,
  id: &str,
  base_url: &str,
  poster_path: Option<String>,
  backdrop_path: Option<String>,
) -> Result<DownloadedMediaAssets, String> {
  let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  let file_name = format!("{}.jpg", id);

  // Download poster
  let poster_dims =
    download_media_image(base_url, poster_path, &app_dir.join("posters"), &file_name).await;

  // Download backdrop
  let backdrop_dims = download_media_image(
    base_url,
    backdrop_path,
    &app_dir.join("backdrops"),
    &file_name,
  )
  .await;

  let (poster_width, poster_height) = poster_dims.unwrap_or((2, 3));

  Ok(DownloadedMediaAssets {
    poster_width,
    poster_height,
    has_poster: poster_dims.is_some(),
    has_backdrop: backdrop_dims.is_some(),
  })
}

pub async fn update_media_data(
  app: tauri::AppHandle,
  id: String,
  api_media: ApiMedia,
  base_url: String,
) -> Result<(), String> {
  let assets = download_assets(
    &app,
    &id,
    &base_url,
    api_media.state.poster_path.clone(),
    api_media.state.backdrop_path.clone(),
  )
  .await?;

  // get db access
  let state = app.state::<DbState>();
  let mut connection = state.connection.lock().unwrap();
  let tx = connection.transaction().map_err(|e| e.to_string())?;

  let base = &api_media.data.base;
  let relations = &api_media.relations;

  // update parent media table
  tx.execute(
    "UPDATE media 
     SET poster_width = ?2, poster_height = ?3, title = ?4, description = ?5, 
         release_date = ?6, has_poster = ?7, has_backdrop = ?8
     WHERE id = ?1",
    params![
      id,
      assets.poster_width,
      assets.poster_height,
      base.title,
      base.description,
      base.release_date,
      assets.has_poster,
      assets.has_backdrop
    ],
  )
  .map_err(|e| e.to_string())?;

  // reset media relation
  tx.execute("DELETE FROM media_person WHERE media_id = ?1", params![id])
    .map_err(|e| e.to_string())?;
  insert_relations_person(&tx, &id, &"crew", &relations.persons).map_err(|e| e.to_string())?;
  insert_relations_person(&tx, &id, &"cast", &relations.cast).map_err(|e| e.to_string())?;
  tx.execute("DELETE FROM media_company WHERE media_id = ?1", params![id])
    .map_err(|e| e.to_string())?;
  insert_relations_company(&tx, &id, &relations.companies).map_err(|e| e.to_string())?;
  tx.execute("DELETE FROM media_tag WHERE media_id = ?1", params![id])
    .map_err(|e| e.to_string())?;
  insert_media_tags(&tx, &id, &relations.tags).map_err(|e| e.to_string())?;

  // insert details
  match &api_media.data.extension {
    MediaExtension::Movie { duration } => {
      tx.execute(
        "REPLACE INTO movie (media_id, duration) VALUES (?1, ?2)",
        params![id, duration],
      )
      .map_err(|e| e.to_string())?;
    }
    MediaExtension::Series { seasons, episodes } => {
      tx.execute(
        "REPLACE INTO series (media_id, seasons, episodes) VALUES (?1, ?2, ?3)",
        params![id, seasons, episodes],
      )
      .map_err(|e| e.to_string())?;
    }
    MediaExtension::Game {
      player_count,
      playing_time,
    } => {
      tx.execute(
        "REPLACE INTO tabletop_game (media_id, player_count, playing_time) VALUES (?1, ?2, ?3)",
        params![id, player_count, playing_time],
      )
      .map_err(|e| e.to_string())?;
    }
    MediaExtension::None => {}
  }

  tx.commit().map_err(|e| e.to_string())?;

  Ok(())
}

/* ADD media */

use rusqlite::{params, Connection, Transaction};
use tauri::Manager;

pub fn insert_external_media(
  tx: &Transaction,
  api_media: ApiMedia,
  media_uuid: &str,
  poster_width: u32,
  poster_height: u32,
  has_poster: bool,
  has_backdrop: bool,
) -> Result<(), rusqlite::Error> {
  println!("insert_external_media: {}", media_uuid);

  let external_id = api_media.state.external_id;
  let base = &api_media.data.base;
  let relations = &api_media.relations;
  let added_date = chrono::Utc::now().to_rfc3339();

  // insert in parent media table
  tx.execute(
    "INSERT INTO media (id, external_id, media_type, poster_width, poster_height, title, description, release_date, added_date, status, favorite, notes, has_poster, has_backdrop)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
    params![
      media_uuid,
      external_id,
      base.media_type.to_string(),
      poster_width,
      poster_height,
      base.title,
      base.description,
      base.release_date,
      added_date,
      "TO_DISCOVER",
      false,
      "",
      has_poster,
      has_backdrop
    ],
  )?;
  insert_relations_person(tx, media_uuid, &"crew", &relations.persons)?;
  insert_relations_person(tx, media_uuid, &"cast", &relations.cast)?;
  insert_relations_company(tx, media_uuid, &relations.companies)?;
  insert_media_tags(tx, media_uuid, &relations.tags)?;

  // insert details
  match &api_media.data.extension {
    MediaExtension::Movie { duration } => {
      tx.execute(
        "INSERT INTO movie (media_id, duration) VALUES (?1, ?2)",
        params![media_uuid, duration],
      )?;
    }
    MediaExtension::Series { seasons, episodes } => {
      tx.execute(
        "INSERT INTO series (media_id, seasons, episodes) VALUES (?1, ?2, ?3)",
        params![media_uuid, seasons, episodes],
      )?;
    }
    MediaExtension::Game {
      player_count,
      playing_time,
    } => {
      tx.execute(
        "INSERT INTO tabletop_game (media_id, player_count, playing_time) VALUES (?1, ?2, ?3)",
        params![media_uuid, player_count, playing_time],
      )?;
    }
    MediaExtension::None => {}
  }

  Ok(())
}

fn insert_relations_person(
  tx: &Transaction,
  media_id: &str,
  category: &str,
  persons: &HashMap<String, ApiEntityRelation>,
) -> Result<(), rusqlite::Error> {
  for (name, relation) in persons {
    tx.execute("INSERT OR IGNORE INTO person (name) VALUES (?1)", [name])?;

    for role in &relation.values {
      tx.execute(
        "INSERT INTO media_person (media_id, person_id, category, role, sort_order) 
         SELECT ?1, id, ?3, ?4, ?5 FROM person WHERE name = ?2",
        params![media_id, name, category, role, relation.order.unwrap_or(0)],
      )?;
    }
  }
  Ok(())
}
fn insert_relations_company(
  tx: &Transaction,
  media_id: &str,
  companies: &HashMap<String, ApiEntityRelation>,
) -> Result<(), rusqlite::Error> {
  for (name, relation) in companies {
    tx.execute("INSERT OR IGNORE INTO company (name) VALUES (?1)", [name])?;
    for role in &relation.values {
      tx.execute(
        "INSERT INTO media_company (media_id, company_id, role, sort_order) 
         SELECT ?1, id, ?3, ?4 FROM company WHERE name = ?2",
        params![media_id, name, role, relation.order.unwrap_or(0)],
      )?;
    }
  }
  Ok(())
}
fn insert_media_tags(
  tx: &Transaction,
  media_id: &str,
  tags: &HashMap<TagType, Vec<String>>,
) -> Result<(), rusqlite::Error> {
  for (tag_type, tag_names) in tags {
    let type_str = serde_plain::to_string(tag_type).unwrap();
    for name in tag_names {
      tx.execute("INSERT OR IGNORE INTO tag (name) VALUES (?1)", [name])?;
      tx.execute(
        "INSERT INTO media_tag (media_id, tag_id, type) 
               SELECT ?1, id, ?3 FROM tag WHERE name = ?2",
        params![media_id, name, type_str],
      )?;
    }
  }
  Ok(())
}

async fn download_media_image(
  base_url: &str,
  url: Option<String>,
  target_dir: &PathBuf,
  file_name: &str,
) -> Option<(u32, u32)> {
  let url_str = url.filter(|u| !u.is_empty() && !u.ends_with("null"))?;

  let response = reqwest::get(format!("{}{}", base_url, url_str))
    .await
    .ok()?;
  let bytes = response.bytes().await.ok()?;

  std::fs::create_dir_all(target_dir).ok()?;
  let file_path = target_dir.join(file_name);
  std::fs::write(&file_path, &bytes).ok()?;

  imagesize::size(&file_path)
    .map(|size| (size.width as u32, size.height as u32))
    .ok()
}

#[tauri::command]
pub async fn add_media_to_library(
  app: tauri::AppHandle,
  api_media: ApiMedia,
  base_url: String,
) -> Result<String, String> {
  let media_uuid = uuid::Uuid::new_v4().to_string();

  let assets = download_assets(
    &app,
    &media_uuid,
    &base_url,
    api_media.state.poster_path.clone(),
    api_media.state.backdrop_path.clone(),
  )
  .await?;

  // get db access
  let state = app.state::<DbState>();
  let mut connection = state.connection.lock().unwrap();
  let tx = connection.transaction().map_err(|e| e.to_string())?;

  insert_external_media(
    &tx,
    api_media,
    &media_uuid,
    assets.poster_width,
    assets.poster_height,
    assets.has_poster,
    assets.has_backdrop,
  )
  .map_err(|e| e.to_string())?;

  tx.commit().map_err(|e| e.to_string())?;

  Ok(media_uuid)
}

/* DELETE media */

fn delete_media_files(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
  let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

  let folders = ["posters", "backdrops"];

  for folder in folders {
    let path = app_dir.join(folder).join(format!("{}.jpg", id));

    if path.exists() {
      fs::remove_file(&path)
        .map_err(|e| format!("Failed to delete {} for media {}: {}", folder, id, e))?;
    }
  }
  Ok(())
}

#[tauri::command]
pub fn delete_media(
  app: tauri::AppHandle,
  state: tauri::State<'_, DbState>,
  id: String,
) -> Result<(), String> {
  let mut connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;

  let tx = connection
    .transaction()
    .map_err(|e| format!("Failed to start transaction: {}", e))?;

  tx.execute("DELETE FROM media WHERE id = ?1", params![id])
    .map_err(|e| format!("Database error during deletion: {}", e))?;

  delete_media_files(&app, &id)?;

  tx.commit()
    .map_err(|e| format!("Failed to commit transaction: {}", e))?;

  Ok(())
}
