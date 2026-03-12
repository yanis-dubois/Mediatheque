use std::collections::HashMap;

use crate::db::DbState;
use crate::models::enums::{CollectionMediaType, EntityType, MetadataType};
use crate::models::metadata::{Company, Person, Tag};

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
  tag_filter: Option<&str>,
  metadata_type: MetadataType,
  search_query: String,
  context: CollectionMediaType,
) -> Result<Vec<(String, EntityType)>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;

  let relation_table = if tag_filter.is_some() {
    "media_tag".to_string()
  } else {
    format!("media_{}", table)
  };
  let fk_column = if tag_filter.is_some() {
    "tag_id".to_string()
  } else {
    format!("{}_id", table)
  };
  let pattern = format!("%{}%", search_query);

  // filter by type for tag
  let type_clause = if let Some(t) = tag_filter {
    format!("AND type = '{}'", t)
  } else {
    "".to_string()
  };

  let sql = if context == CollectionMediaType::All {
    if let Some(t) = tag_filter {
      // JOIN media_tag to filter by type
      format!(
        "SELECT DISTINCT CAST(t.id AS TEXT), t.name 
         FROM tag t 
         JOIN media_tag mt ON t.id = mt.tag_id 
         WHERE t.name LIKE ?1 AND mt.type = '{}' 
         ORDER BY t.name ASC",
        t
      )
    } else {
      format!(
        "SELECT CAST(id AS TEXT), name FROM {} WHERE name LIKE ?1 ORDER BY name ASC",
        table
      )
    }
  } else {
    format!(
      "SELECT DISTINCT CAST(t.id AS TEXT), t.name 
       FROM {} t
       JOIN {} rel ON t.id = rel.{}
       JOIN media m ON rel.media_id = m.id
       WHERE t.name LIKE ?1 AND m.media_type = ?2 {} {}
       ORDER BY t.name ASC",
      table,
      relation_table,
      fk_column,
      type_clause,
      // if tag, also filter type in media_tag
      if tag_filter.is_some() {
        format!("AND rel.type = '{}'", tag_filter.unwrap())
      } else {
        "".to_string()
      }
    )
  };

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;

  let entity_type = match metadata_type {
    MetadataType::Person => EntityType::Person,
    MetadataType::Company => EntityType::Company,
    MetadataType::Saga => EntityType::Saga,
    MetadataType::Genre => EntityType::Genre,
    MetadataType::GameMechanic => EntityType::GameMechanic,
  };

  let params: Vec<String> = if context == CollectionMediaType::All {
    vec![pattern]
  } else {
    vec![pattern, context.to_db_string()]
  };

  let params_refs: Vec<&dyn rusqlite::ToSql> =
    params.iter().map(|s| s as &dyn rusqlite::ToSql).collect();

  let rows = stmt
    .query_map(&*params_refs, |row| {
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
) -> Result<Vec<Tag>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_batch(&connection, "tag", ids, map_row_to_tag)
}
#[tauri::command]
pub fn get_saga_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<Tag, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_by_id(&connection, "tag", id, map_row_to_tag)
}

#[tauri::command]
pub fn get_genre_batch(
  state: tauri::State<'_, DbState>,
  ids: Vec<String>,
) -> Result<Vec<Tag>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_batch(&connection, "tag", ids, map_row_to_tag)
}
#[tauri::command]
pub fn get_genre_by_id(state: tauri::State<'_, DbState>, id: String) -> Result<Tag, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_by_id(&connection, "tag", id, map_row_to_tag)
}

#[tauri::command]
pub fn get_game_mechanic_batch(
  state: tauri::State<'_, DbState>,
  ids: Vec<String>,
) -> Result<Vec<Tag>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_batch(&connection, "tag", ids, map_row_to_tag)
}
#[tauri::command]
pub fn get_game_mechanic_by_id(
  state: tauri::State<'_, DbState>,
  id: String,
) -> Result<Tag, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;
  fetch_by_id(&connection, "tag", id, map_row_to_tag)
}

#[tauri::command]
pub fn get_metadata_layout(
  state: tauri::State<'_, DbState>,
  metadata_type: MetadataType,
  query: String,
  context: CollectionMediaType,
) -> Result<Vec<(String, EntityType)>, String> {
  let (table, tag_filter) = match metadata_type {
    MetadataType::Person => ("person", None),
    MetadataType::Company => ("company", None),
    MetadataType::Saga => ("tag", Some("SAGA")),
    MetadataType::Genre => ("tag", Some("GENRE")),
    MetadataType::GameMechanic => ("tag", Some("GAME_MECHANIC")),
  };

  fetch_layout_data(&state, table, tag_filter, metadata_type, query, context)
}

#[tauri::command]
pub fn get_all_roles_for_descriptor(
  state: tauri::State<'_, DbState>,
  descriptor_type: MetadataType,
  descriptor_id: u32,
) -> Result<HashMap<String, Vec<String>>, String> {
  let connection = state.connection.lock().map_err(|_| "Lock failed")?;

  let (table, id_col) = match descriptor_type {
    MetadataType::Person => ("media_person", "person_id"),
    MetadataType::Company => ("media_company", "company_id"),
    _ => return Ok(HashMap::new()),
  };

  let sql = format!("SELECT media_id, role FROM {} WHERE {} = ?1", table, id_col);

  let mut stmt = connection.prepare(&sql).map_err(|e| e.to_string())?;

  let rows = stmt
    .query_map([descriptor_id], |row| {
      Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })
    .map_err(|e| e.to_string())?;

  let mut roles_map: HashMap<String, Vec<String>> = HashMap::new();

  for row in rows {
    let (m_id, role) = row.map_err(|e| e.to_string())?;
    roles_map.entry(m_id).or_insert_with(Vec::new).push(role);
  }

  Ok(roles_map)
}
