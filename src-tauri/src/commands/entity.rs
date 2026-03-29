use crate::db::DbState;
use crate::models::enums::{match_entity_type, EntityType, MediaType};

#[tauri::command]
pub fn search_in_library(
  state: tauri::State<'_, DbState>,
  search_query: String,
  context: Option<MediaType>,
) -> Result<Vec<(String, EntityType)>, String> {
  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;
  let sql_like = format!("%{}%", search_query);

  let (type_filter, has_context) = if context.is_none() {
    ("", false)
  } else {
    ("AND m.media_type = ?2", true)
  };

  let query_str = format!(
    "
    -- 1. MEDIA
    SELECT id, 'MEDIA' as type FROM media m WHERE title LIKE ?1 {media_filter}
    
    UNION ALL
    
    -- 2. COLLECTIONS (On garde celles du type ou celles qui acceptent tout)
    SELECT id, 'COLLECTION' as type FROM collection WHERE name LIKE ?1 
    {media_filter}
    
    UNION ALL
    
    -- 3. PERSONS (Uniquement si liées à un média du type context)
    SELECT DISTINCT CAST(p.id AS TEXT), 'PERSON' as type 
    FROM person p
    JOIN media_person mp ON p.id = mp.person_id
    JOIN media m ON mp.media_id = m.id
    WHERE p.name LIKE ?1 {type_filter}
    
    UNION ALL
    
    -- 4. COMPANIES
    SELECT DISTINCT CAST(c.id AS TEXT), 'COMPANY' as type 
    FROM company c
    JOIN media_company mc ON c.id = mc.company_id
    JOIN media m ON mc.media_id = m.id
    WHERE c.name LIKE ?1 {type_filter}
    
    UNION ALL
    
    -- 5. TAGS (Filtrés par leur catégorie ET par le type de média lié)
    SELECT DISTINCT CAST(t.id AS TEXT), mt.type as type 
    FROM tag t
    JOIN media_tag mt ON t.id = mt.tag_id
    JOIN media m ON mt.media_id = m.id
    WHERE t.name LIKE ?1 AND mt.type IN ('GENRE', 'SAGA', 'GAME_MECHANIC') {type_filter}
    
    LIMIT 100
    ",
    media_filter = if has_context {
      "AND media_type = ?2"
    } else {
      ""
    },
    type_filter = type_filter
  );

  let mut stmt = connection.prepare(&query_str).map_err(|e| e.to_string())?;

  let data = if has_context {
    stmt
      .query_map([sql_like.clone(), context.unwrap().to_string()], |row| {
        let id: String = row.get(0)?;
        let type_str: String = row.get(1)?;
        let entity_type = match_entity_type(type_str.as_str());

        Ok((id, entity_type))
      })
      .map_err(|e| e.to_string())?
      .collect::<rusqlite::Result<Vec<_>>>()
      .map_err(|e| e.to_string())
  } else {
    stmt
      .query_map([sql_like.clone()], |row| {
        let id: String = row.get(0)?;
        let type_str: String = row.get(1)?;
        let entity_type = match_entity_type(type_str.as_str());

        Ok((id, entity_type))
      })
      .map_err(|e| e.to_string())?
      .collect::<rusqlite::Result<Vec<_>>>()
      .map_err(|e| e.to_string())
  }?;

  Ok(data)
}
