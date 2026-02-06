use rusqlite::params;

use crate::commands::media::{get_media_list, map_row_to_media, match_media_type};
use crate::db::{DbState};
use crate::models::collection::Collection;
use crate::models::enums::{CollectionMediaType, CollectionType, CollectionView};
use crate::models::query::{MediaFilter, Pagination};

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
fn match_collection_view(s: &str) -> CollectionView {
  match s {
    "GRID" => CollectionView::Grid,
    "ROW" => CollectionView::Row,
    "COLUMN" => CollectionView::Column,
    _ => CollectionView::Grid
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
    prefered_view: match_collection_view(&prefered_view_str),
    has_image: has_image_int == 1,
    media_list: vec![],
  })
}

#[tauri::command]
pub fn get_collection_by_id(
    state: tauri::State<'_, DbState>,
    collection_id: String,
    pagination: Pagination
) -> Result<Collection, String> {

  // retrieve data from Collection
  let mut collection = {
    let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;
    let mut stmt = connection.prepare("SELECT * FROM collection WHERE id = ?1")
      .map_err(|e| e.to_string())?;

    stmt.query_row([&collection_id], map_row_to_collection)
      .map_err(|e| e.to_string())?
  };

  // retrieve media list
  match collection.collection_type {
    CollectionType::Dynamic => {
      // retrieve filter
      let filter_json: Option<String> = {
        let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;
        connection.query_row(
          "SELECT filter FROM collection_dynamic_filter WHERE collection_id = ?1",
          [&collection_id],
          |r| r.get(0)
        ).ok()
      };

      // JSON -> MediaFilter
      let filter: MediaFilter = filter_json
            .and_then(|json| serde_json::from_str(&json).ok())
            .unwrap_or_default();

      // get corresponding media list
      collection.media_list = get_media_list(state, filter, collection.sort_order.clone(), pagination)?;
    },
    CollectionType::Manual => {
      let connection = state.connection.lock().map_err(|_| "DB Lock failed")?;
      
      // get filtered media list
      let mut stmt = connection.prepare(
        "SELECT m.* FROM media m
          INNER JOIN collection_media cm ON m.id = cm.media_id
          WHERE cm.collection_id = ?1
          ORDER BY cm.position ASC
          LIMIT ?2 OFFSET ?3"
      ).map_err(|e| e.to_string())?;

      let list = stmt.query_map(
        params![collection_id, pagination.limit, pagination.offset],
        map_row_to_media
      )
      .map_err(|e| e.to_string())?
      .collect::<rusqlite::Result<Vec<_>>>()
      .map_err(|e| e.to_string())?;

      collection.media_list = list;
    }
  }

  Ok(collection)
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
