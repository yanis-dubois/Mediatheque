use crate::db::DbState;
use crate::models::enums::{match_entity_type, EntityType};

#[tauri::command]
pub fn search_in_library(
  state: tauri::State<'_, DbState>,
  search_query: String,
) -> Result<Vec<(String, EntityType)>, String> {
  println!("search_in_library : {}", search_query);

  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;
  let sql_query = format!("%{}%", search_query);

  let mut stmt = connection
    .prepare(
      "
      SELECT id, 'MEDIA' as type FROM media WHERE title LIKE ?1
      UNION ALL
      SELECT id, 'COLLECTION' as type FROM collection WHERE name LIKE ?1
      UNION ALL
      SELECT CAST(id AS TEXT), 'PERSON' as type FROM person WHERE name LIKE ?1
      UNION ALL
      SELECT CAST(id AS TEXT), 'COMPANY' as type FROM company WHERE name LIKE ?1
      UNION ALL
      SELECT CAST(id AS TEXT), 'SAGA' as type FROM saga WHERE name LIKE ?1
      UNION ALL
      SELECT CAST(id AS TEXT), 'GENRE' as type FROM genre WHERE name LIKE ?1
      UNION ALL
      SELECT CAST(id AS TEXT), 'GAME_MECHANIC' as type FROM game_mechanic WHERE name LIKE ?1
      LIMIT 100
      ",
    )
    .map_err(|e| e.to_string())?;

  let data = stmt
    .query_map([sql_query], |row| {
      let id: String = row.get(0)?;
      let type_str: String = row.get(1)?;
      let entity_type = match_entity_type(type_str.as_str());

      Ok((id, entity_type))
    })
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  Ok(data)
}
