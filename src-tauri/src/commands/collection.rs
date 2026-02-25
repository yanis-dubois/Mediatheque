use rusqlite::params;

use crate::commands::media::{get_media_layout_list};
use crate::db::{DbState};
use crate::models::collection::{Collection, ExternalCollection};
use crate::models::enums::{CollectionLayout, CollectionMediaType, CollectionType, MediaType, match_collection_media_type, match_collection_type, match_collection_view};
use crate::models::query::{MediaFilter, MediaOrder};

// convert SQL -> Collection
fn map_row_to_collection(row: &rusqlite::Row) -> rusqlite::Result<Collection> {

  // data that has to be transformed
  let collection_type_str: String = row.get(2)?;
  let collection_media_type_str: String = row.get(3)?;
  let fav_int: i32 = row.get(5)?;
  let prefered_view_str: String = row.get(7)?;
  let sort_order_raw: String = row.get(8)?;
  let filter_raw: Option<String> = row.get(9)?;
  let has_image_int: i32 = row.get(10)?;
  let can_be_sorted_int: i32 = row.get(11)?;

  let mut collection = Collection {
    id: row.get(0)?,
    name: row.get(1)?,
    collection_type: match_collection_type(&collection_type_str),
    media_type: match_collection_media_type(&collection_media_type_str),
    added_date: row.get(4)?,
    favorite: fav_int == 1,
    description: row.get(6)?,
    preferred_layout: match_collection_view(&prefered_view_str),
    sort_order: serde_json::from_str(&sort_order_raw).unwrap_or_default(),
    has_image: has_image_int == 1,
    can_be_sorted: can_be_sorted_int == 1,
    filter: MediaFilter { ..Default::default() }
  };

  // set filter
  match collection.collection_type {
    CollectionType::Dynamic | CollectionType::System => {
      // JSON -> MediaFilter
      collection.filter = filter_raw
        .and_then(|json| serde_json::from_str(&json).ok())
        .unwrap_or_default();
    },
    CollectionType::Manual => {
      collection.filter.collection_id = Some(collection.id.clone());
    }
  }

  Ok(collection)
}

/* -- GET -- */

#[tauri::command]
pub fn get_collection_by_id(
  state: tauri::State<'_, DbState>,
  collection_id: String,
) -> Result<Collection, String> {
  let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;

  let mut stmt = connection.prepare("SELECT * FROM collection WHERE id = ?1")
    .map_err(|e| e.to_string())?;

  let collection = stmt.query_row([&collection_id], map_row_to_collection)
    .map_err(|e| e.to_string())?;

  Ok(collection)
}

#[tauri::command]
pub fn get_collection_batch(
    state: tauri::State<'_, DbState>,
    ids: Vec<String>,
) -> Result<Vec<Collection>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;

  let placeholders: String = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
  let sql = format!("SELECT * FROM collection WHERE id IN ({})", placeholders);

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;

  let list = stmt.query_map(rusqlite::params_from_iter(ids), map_row_to_collection)
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  Ok(list)
}

#[tauri::command]
pub fn get_collection_layout_data(
  state: tauri::State<'_, DbState>,
  collection_id: String
) -> Result<Vec<(String, u16, u16)>, String> {

  // retrieve data from Collection
  let collection = get_collection_by_id(state.clone(), collection_id.clone())?;

  let data = get_media_layout_list(state, collection.collection_type.clone(), collection.media_type.clone(), collection.filter, collection.sort_order)?;

  Ok(data)
}

#[tauri::command]
pub fn search_in_collections(
  state: tauri::State<'_, DbState>,
  search_query: String,
  media_type: CollectionMediaType, 
  is_collection_picker: bool
) -> Result<Vec<String>, String> {
  let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;

  // Base
  let mut sql = "SELECT id FROM collection WHERE name LIKE ?1".to_string();
  let pattern = if search_query.trim().is_empty() { "%".to_string() } else { format!("%{}%", search_query.trim()) };
  let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(pattern)];

  // WHERE
  if is_collection_picker {
    sql.push_str(" AND type = 'MANUAL' AND (media_type = ?2 OR media_type = 'ALL')");
    params.push(Box::new(media_type.to_db_string()));
  } else if media_type != CollectionMediaType::All {
    sql.push_str(" AND media_type = ?2");
    params.push(Box::new(media_type.to_db_string()));
  }

  // ORDER BY
  sql.push_str(" ORDER BY type DESC, favorite DESC, name COLLATE NOCASE ASC");

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;
  let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

  let ids = stmt.query_map(&params_refs[..], |row| row.get(0))
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<String>>>()
    .map_err(|e| e.to_string())?;

  Ok(ids)
}

#[tauri::command]
pub fn search_layout_data(
  state: tauri::State<'_, DbState>,
  query: String,
  media_type: CollectionMediaType
) -> Result<Vec<(String, u16, u16)>, String> {
  println!("search_layout_data : {}", query);

  let filter = MediaFilter {
    search_query: 
      if query == "" { None } 
      else { Some(query) },
    media_type: match media_type {
      CollectionMediaType::All => None,
      CollectionMediaType::Specific(mt) => Some(mt),
    },
    ..Default::default()
  };

  let data = get_media_layout_list(state, CollectionType::Dynamic, CollectionMediaType::All, filter, vec![])?;

  Ok(data)
}

#[tauri::command]
pub fn search_in_collection(
  state: tauri::State<'_, DbState>,
  collection_id: String,
  search_query: String
) -> Result<Vec<(String, u16, u16)>, String> {
  println!("search_in_collection : {}", search_query);

  let mut collection = get_collection_by_id(state.clone(), collection_id.clone())?;

  collection.filter.search_query = 
    if search_query == "" { None } 
    else { Some(search_query) };

  let data = get_media_layout_list(state, collection.collection_type.clone(), collection.media_type.clone(), collection.filter, collection.sort_order)?;

  Ok(data)
}

/* -- UPDATE -- */

#[tauri::command]
pub fn toggle_collection_favorite(state: tauri::State<'_, DbState>, id: String, is_favorite: bool) -> Result<(), String> {
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  connection.execute(
    "UPDATE collection SET favorite = ?1 WHERE id = ?2",
    [if is_favorite { "1" } else { "0" }, &id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_collection_name(state: tauri::State<'_, DbState>, id: String, name: String) -> Result<(), String> {
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  connection.execute(
    "UPDATE collection SET name = ?1 WHERE id = ?2",
    [name, id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_collection_description(state: tauri::State<'_, DbState>, id: String, description: String) -> Result<(), String> {
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  connection.execute(
    "UPDATE collection SET description = ?1 WHERE id = ?2",
    [description, id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_collection_preferred_layout(state: tauri::State<'_, DbState>, id: String, layout: CollectionLayout) -> Result<(), String> {
  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  connection.execute(
    "UPDATE collection SET preferred_layout = ?1 WHERE id = ?2",
    [layout.to_string(), id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_collection_sort(state: tauri::State<'_, DbState>, id: String, sort: Vec<MediaOrder>) -> Result<(), String> {
  println!("update_collection_sort");

  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  // Vec<MediaOrder> -> JSON
  let sort_order_json = serde_json::to_string(&sort)
    .map_err(|e| e.to_string())?;

  connection.execute(
    "UPDATE collection SET sort_order = ?1 WHERE id = ?2",
    [sort_order_json, id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_collection_filter(state: tauri::State<'_, DbState>, id: String, filter: MediaFilter) -> Result<(), String> {
  println!("update_collection_filter");

  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  // MediaFilter -> JSON
  let filter_json = serde_json::to_string(&filter)
    .map_err(|e| e.to_string())?;

  connection.execute(
    "UPDATE collection SET filter = ?1 WHERE id = ?2",
    [filter_json, id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_collection_media_type(state: tauri::State<'_, DbState>, id: String, media_type: CollectionMediaType) -> Result<(), String> {
  println!("update_collection_media_type");

  let connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  connection.execute(
    "UPDATE collection SET media_type = ?1 WHERE id = ?2",
    [media_type.to_db_string(), id],
  )
  .map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn add_media_batch_to_collection(state: tauri::State<'_, DbState>, id: String, media_ids: Vec<String>) -> Result<(), String> {
  println!("add_media_batch_to_collection");

  let mut connection = state.connection.lock().map_err(|_| "Failed to lock database")?;

  let tx = connection.transaction().map_err(|e| e.to_string())?;

  {
    // retrieve max position
    let mut pos_stmt = tx.prepare(
      "SELECT COALESCE(MAX(position), 0) FROM collection_media WHERE collection_id = ?1"
    ).map_err(|e| e.to_string())?;

    let mut current_pos: i32 = pos_stmt.query_row([&id], |row| row.get(0)).unwrap_or(0);

    // insert media batch (without duplicates)
    let mut stmt = tx.prepare(
      "INSERT INTO collection_media (collection_id, media_id, position) 
        SELECT ?1, ?2, ?3 
        WHERE NOT EXISTS (
          SELECT 1 FROM collection_media WHERE collection_id = ?1 AND media_id = ?2
        )"
    ).map_err(|e| e.to_string())?;

    for media_id in media_ids {
      current_pos += 1;
      stmt.execute(rusqlite::params![id, media_id, current_pos]).map_err(|e| e.to_string())?;
    }
  }

  tx.commit().map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn add_media_to_collection_batch(state: tauri::State<'_, DbState>, media_id: String, collection_ids: Vec<String>) -> Result<(), String> {
  println!("add_media__to_collection_batch");

  let mut connection = state.connection.lock().map_err(|_| "DB Lock failed")?;

  let tx = connection.transaction().map_err(|e| e.to_string())?;

  {
    let mut stmt = tx.prepare(
      "INSERT INTO collection_media (collection_id, media_id, position) 
        VALUES (
          ?1, 
          ?2, 
          (SELECT COALESCE(MAX(position), 0) + 1 FROM collection_media WHERE collection_id = ?1)
        )"
    ).map_err(|e| e.to_string())?;

    for id in collection_ids {
      stmt.execute([id, media_id.clone()]).map_err(|e| e.to_string())?;
    }
  }

  tx.commit().map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn remove_media_from_collection(
  state: tauri::State<'_, DbState>, 
  id: String, 
  media_id: String
) -> Result<(), String> {
  println!("remove_media_from_collection");

  let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;
  
  connection.execute(
    "DELETE FROM collection_media WHERE collection_id = ?1 AND media_id = ?2",
    [&id, &media_id],
  ).map_err(|e| e.to_string())?;

  Ok(())
}

#[tauri::command]
pub fn update_pinned_collections(
    state: tauri::State<'_, DbState>, 
    context: String,
    collection_ids: Vec<String>
) -> Result<(), String> {
  let mut connection = state.connection.lock().map_err(|_| "Failed to lock database")?;
  let tx = connection.transaction().map_err(|e| e.to_string())?;

  // delete old position
  tx.execute(
    "DELETE FROM home_slots WHERE context = ?1", 
    [&context]
  ).map_err(|e| e.to_string())?;

  // insert new position
  for (index, id) in collection_ids.iter().take(16).enumerate() {
    tx.execute(
      "INSERT INTO home_slots (context, position, collection_id) VALUES (?1, ?2, ?3)",
      params![context, index as i32, id],
    ).map_err(|e| e.to_string())?;
  }

  tx.commit().map_err(|e| e.to_string())?;

  println!("Pinned collections updated for context: {}", context);
  Ok(())
}

/* create */

#[tauri::command]
pub fn create_collection(
  state: tauri::State<'_, DbState>, 
  data: ExternalCollection
) -> Result<String, String> {
  println!("create_collection");

  let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;

  // retrieve data
  let collection_type_str = data.collection_type.to_string();
  let media_type_str = &data.media_type.to_db_string();

  // create missing data
  let collection_uuid = uuid::Uuid::new_v4().to_string();
  let added_date = chrono::Utc::now().to_rfc3339();
  let prefered_view = match data.media_type {
    CollectionMediaType::Specific(MediaType::Book) => CollectionLayout::Column,
    CollectionMediaType::Specific(MediaType::Movie) => CollectionLayout::Grid,
    CollectionMediaType::Specific(MediaType::Series) => CollectionLayout::Grid,
    CollectionMediaType::Specific(MediaType::VideoGame) => CollectionLayout::Grid,
    _ => CollectionLayout::Row
  };
  let view_str = prefered_view.to_string();

  // insert in parent table Collection
  connection.execute(
    "INSERT INTO collection (id, name, type, media_type, added_date, favorite, description, preferred_layout, sort_order, filter, has_image)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
    params![
      collection_uuid,
      "New Collection",
      collection_type_str,
      media_type_str,
      added_date,
      0,
      "",
      view_str,
      "[]",
      "{}",
      false,
    ],
  ).map_err(|e| e.to_string())?;

  println!("collection created !");
  Ok(collection_uuid)
}

/* delete */

#[tauri::command]
pub fn delete_collection(
  state: tauri::State<'_, DbState>, 
  id: String
) -> Result<(), String> {
  println!("delete_collection");

  let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;

  connection.execute(
    "DELETE FROM collection WHERE id = ?1",
    [&id],
  ).map_err(|e| e.to_string())?;

  Ok(())
}
