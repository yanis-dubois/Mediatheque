use crate::db::DbState;
use crate::models::enums::{EntityType, MetadataType};
use crate::models::metadata::{Company, Person, Saga, Tag};

// convert SQL -> Metadata
pub fn map_row_to_person(row: &rusqlite::Row) -> rusqlite::Result<Person> {
  let id_numeric: i32 = row.get(0)?;

  Ok(Person {
    id: id_numeric.to_string(),
    name: row.get(1)?,
  })
}
pub fn map_row_to_company(row: &rusqlite::Row) -> rusqlite::Result<Company> {
  let id_numeric: i32 = row.get(0)?;

  Ok(Company {
    id: id_numeric.to_string(),
    name: row.get(1)?,
  })
}
pub fn map_row_to_saga(row: &rusqlite::Row) -> rusqlite::Result<Saga> {
  let id_numeric: i32 = row.get(0)?;

  Ok(Saga {
    id: id_numeric.to_string(),
    name: row.get(1)?,
  })
}
pub fn map_row_to_tag(row: &rusqlite::Row) -> rusqlite::Result<Tag> {
  let id_numeric: i32 = row.get(0)?;

  Ok(Tag {
    id: id_numeric.to_string(),
    name: row.get(1)?,
  })
}

use rusqlite::{params_from_iter, Result as SqlResult, Row};

fn fetch_layout_data(
  state: &tauri::State<'_, DbState>,
  table: &str,
  metadata_type: MetadataType,
  search_query: String,
) -> Result<Vec<(String, EntityType)>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;

  let pattern = format!("%{}%", search_query);
  let sql = format!(
    "SELECT CAST(id AS TEXT), name FROM {} WHERE name LIKE ?1 ORDER BY name ASC",
    table
  );

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;

  let entity_type = match metadata_type {
    MetadataType::Person => EntityType::Person,
    MetadataType::Company => EntityType::Company,
    MetadataType::Saga => EntityType::Saga,
    MetadataType::Genre => EntityType::Genre,
    MetadataType::GameMechanic => EntityType::GameMechanic,
  };

  let rows = stmt
    .query_map([pattern], |row| {
      let id: String = row.get(0)?;
      Ok((id, entity_type.clone()))
    })
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  Ok(rows)
}
fn fetch_batch<T, F>(
  connection: &rusqlite::Connection,
  table: &str,
  ids: Vec<String>,
  mapper: F,
) -> Result<Vec<T>, String>
where
  F: FnMut(&Row) -> SqlResult<T>,
{
  if ids.is_empty() {
    return Ok(vec![]);
  }

  let numeric_ids: Vec<i32> = ids.iter().filter_map(|id| id.parse().ok()).collect();
  if numeric_ids.is_empty() {
    return Ok(vec![]);
  }

  let placeholders = vec!["?"; numeric_ids.len()].join(",");
  let sql = format!("SELECT * FROM {} WHERE id IN ({})", table, placeholders);

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;
  let data = stmt
    .query_map(params_from_iter(numeric_ids), mapper)
    .map_err(|e| e.to_string())?
    .collect::<SqlResult<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  Ok(data)
}
fn fetch_by_id<T, F>(
  connection: &rusqlite::Connection,
  table: &str,
  id: String,
  mapper: F,
) -> Result<T, String>
where
  F: FnOnce(&Row) -> SqlResult<T>,
{
  let numeric_id: i32 = id.parse().map_err(|_| "Invalid ID format")?;
  let sql = format!("SELECT * FROM {} WHERE id = ?1", table);

  connection
    .query_row(&sql, [numeric_id], mapper)
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_person_batch(
  state: tauri::State<'_, DbState>,
  ids: Vec<String>,
) -> Result<Vec<Person>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_batch(&connection, "person", ids, map_row_to_person)
}
#[tauri::command]
pub fn get_person_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<Person, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_by_id(&connection, "person", id, map_row_to_person)
}

#[tauri::command]
pub fn get_company_batch(
  state: tauri::State<'_, DbState>,
  ids: Vec<String>,
) -> Result<Vec<Company>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_batch(&connection, "company", ids, map_row_to_company)
}
#[tauri::command]
pub fn get_company_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<Company, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_by_id(&connection, "company", id, map_row_to_company)
}

#[tauri::command]
pub fn get_saga_batch(
  state: tauri::State<'_, DbState>,
  ids: Vec<String>,
) -> Result<Vec<Saga>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_batch(&connection, "saga", ids, map_row_to_saga)
}
#[tauri::command]
pub fn get_saga_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<Saga, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_by_id(&connection, "saga", id, map_row_to_saga)
}

#[tauri::command]
pub fn get_genre_batch(
  state: tauri::State<'_, DbState>,
  ids: Vec<String>,
) -> Result<Vec<Tag>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_batch(&connection, "genre", ids, map_row_to_tag)
}
#[tauri::command]
pub fn get_genre_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<Tag, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_by_id(&connection, "genre", id, map_row_to_tag)
}

#[tauri::command]
pub fn get_game_mechanic_batch(
  state: tauri::State<'_, DbState>,
  ids: Vec<String>,
) -> Result<Vec<Tag>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_batch(&connection, "game_mechanic", ids, map_row_to_tag)
}
#[tauri::command]
pub fn get_game_mechanic_by_id(
  state: tauri::State<'_, DbState>,
  id: String,
) -> Result<Tag, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_by_id(&connection, "game_mechanic", id, map_row_to_tag)
}

#[tauri::command]
pub fn get_metadata_layout(
  state: tauri::State<'_, DbState>,
  metadata_type: MetadataType,
  query: String,
) -> Result<Vec<(String, EntityType)>, String> {
  let table = match metadata_type {
    MetadataType::Person => "person",
    MetadataType::Company => "company",
    MetadataType::Saga => "saga",
    MetadataType::Genre => "genre",
    MetadataType::GameMechanic => "game_mechanic",
  };

  fetch_layout_data(&state, table, metadata_type, query)
}
