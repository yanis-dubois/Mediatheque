use crate::commands::media::{get_media_layout_list, match_media_type};
use crate::db::{DbState};
use crate::models::collection::{Collection};
use crate::models::enums::{CollectionMediaType, CollectionType, CollectionLayout};
use crate::models::query::{MediaFilter, MediaOrder};

// convert SQL TEXT -> Enums
fn match_collection_type(s: &str) -> CollectionType {
  match s {
    "DYNAMIC" => CollectionType::Dynamic,
    "MANUAL" => CollectionType::Manual,
    _ => CollectionType::Manual // default
  }
}
fn match_collection_media_type(s: &str) -> CollectionMediaType {
  match s {
    "ALL" => CollectionMediaType::All,
    _ => CollectionMediaType::Specific(match_media_type(s))
  }
}
fn match_collection_view(s: &str) -> CollectionLayout {
  match s {
    "GRID" => CollectionLayout::Grid,
    "ROW" => CollectionLayout::Row,
    "COLUMN" => CollectionLayout::Column,
    _ => CollectionLayout::Grid
  }
}

// convert SQL -> Collection
fn map_row_to_collection(row: &rusqlite::Row) -> rusqlite::Result<Collection> {

  // data that has to be transformed
  let collection_type_str: String = row.get(2)?;
  let collection_media_type_str: String = row.get(3)?;
  let fav_int: i32 = row.get(5)?;
  let sort_order_raw: String = row.get(7)?;
  let prefered_view_str: String = row.get(8)?;
  let has_image_int: i32 = row.get(9)?;

  Ok(Collection {
    id: row.get(0)?,
    name: row.get(1)?,
    collection_type: match_collection_type(&collection_type_str),
    media_type: match_collection_media_type(&collection_media_type_str),
    added_date: row.get(4)?,
    favorite: fav_int == 1,
    description: row.get(6)?,
    sort_order: serde_json::from_str(&sort_order_raw).unwrap_or_default(),
    preferred_layout: match_collection_view(&prefered_view_str),
    has_image: has_image_int == 1
  })
}

/* -- GET -- */

fn build_filter(
  state: tauri::State<'_, DbState>,
  collection: Collection
) -> Result<MediaFilter, String> {

  let mut filter = MediaFilter::default();

  match collection.collection_type {
    CollectionType::Dynamic => {
      // retrieve filter
      let filter_json: Option<String> = {
        let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;
        connection.query_row(
          "SELECT filter FROM collection_dynamic_filter WHERE collection_id = ?1",
          [collection.id],
          |r| r.get(0)
        ).ok()
      };

      // JSON -> MediaFilter
      filter = filter_json
        .and_then(|json| serde_json::from_str(&json).ok())
        .unwrap_or_default();
    },
    CollectionType::Manual => {
      filter.collection_id = Some(collection.id);
    }
  }

  Ok(filter)
}

#[tauri::command]
pub fn get_collection_by_id(
  state: tauri::State<'_, DbState>,
  collection_id: String,
) -> Result<Collection, String> {
  let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;

  let mut stmt = connection.prepare("SELECT * FROM collection WHERE id = ?1")
    .map_err(|e| e.to_string())?;

  stmt.query_row([&collection_id], map_row_to_collection)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_collection_layout_data(
    state: tauri::State<'_, DbState>,
    collection_id: String
) -> Result<Vec<(String, u16, u16)>, String> {

  // retrieve data from Collection
  let collection = get_collection_by_id(state.clone(), collection_id.clone())?;

  // build filter
  let filter = build_filter(state.clone(), collection.clone())?;

  let data = get_media_layout_list(state, collection.collection_type.clone(), collection.media_type.clone(), filter, collection.sort_order)?;

  Ok(data)
}

#[tauri::command]
pub fn get_all_collection_ids(state: tauri::State<'_, DbState>) -> Result<Vec<String>, String> {
  let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;
  let mut stmt = connection
    .prepare("SELECT id FROM collection ORDER BY favorite DESC, added_date DESC")
    .map_err(|e| e.to_string())?;

  let ids = stmt.query_map([], |row| row.get(0))
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<String>>>()
    .map_err(|e| e.to_string())?;

  Ok(ids)
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
