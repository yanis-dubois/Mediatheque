use crate::db::DbState;
use crate::models::enums::{match_entity_type, EntityType, MediaType};
use crate::models::query::Pagination;

#[tauri::command]
pub fn search_in_library(
  state: tauri::State<'_, DbState>,
  search_query: String,
  context: Option<MediaType>,
  pagination: Pagination,
) -> Result<Vec<(String, EntityType)>, String> {
  let connection = state
    .connection
    .lock()
    .map_err(|_| "Failed to lock database")?;
  let sql_like = if search_query.is_empty() {
    "%".to_string()
  } else {
    format!("%{}%", search_query)
  };
  let search_filter = "LIKE ?1".to_string();

  let (type_filter, has_context) = if context.is_none() {
    ("", false)
  } else {
    ("AND m.media_type = ?2", true)
  };

  let query_str = format!(
    "
    -- 1. MEDIA
    SELECT id, 'MEDIA' as type FROM media m WHERE title {search_filter} {media_filter}
    
    UNION ALL
    
    -- 2. COLLECTIONS (On garde celles du type ou celles qui acceptent tout)
    SELECT id, 'COLLECTION' as type FROM collection WHERE name {search_filter} {media_filter}
    
    UNION ALL
    
    -- 3. PERSONS (Uniquement si liées à un média du type context)
    SELECT DISTINCT CAST(p.id AS TEXT), 'PERSON' as type 
    FROM person p
    JOIN media_person mp ON p.id = mp.person_id
    JOIN media m ON mp.media_id = m.id
    WHERE p.name {search_filter} {type_filter}
    
    UNION ALL
    
    -- 4. COMPANIES
    SELECT DISTINCT CAST(c.id AS TEXT), 'COMPANY' as type 
    FROM company c
    JOIN media_company mc ON c.id = mc.company_id
    JOIN media m ON mc.media_id = m.id
    WHERE c.name {search_filter} {type_filter}
    
    UNION ALL
    
    -- 5. TAGS (Filtrés par leur catégorie ET par le type de média lié)
    SELECT DISTINCT CAST(t.id AS TEXT), mt.type as type 
    FROM tag t
    JOIN media_tag mt ON t.id = mt.tag_id
    JOIN media m ON mt.media_id = m.id
    WHERE t.name {search_filter} AND mt.type IN ('GENRE', 'SAGA', 'GAME_MECHANIC') {type_filter}

    
    LIMIT {limit} OFFSET {offset}
    ",
    media_filter = if has_context {
      "AND media_type = ?2"
    } else {
      ""
    },
    search_filter = search_filter,
    type_filter = type_filter,
    limit = pagination.limit,
    offset = pagination.offset
  );

  let mut params: Vec<String> = vec![sql_like];
  if let Some(ctx) = context {
    params.push(ctx.to_string());
  }

  let mut stmt = connection.prepare(&query_str).map_err(|e| e.to_string())?;

  let data = stmt
    .query_map(rusqlite::params_from_iter(params), |row| {
      let id: String = row.get(0)?;
      let type_str: String = row.get(1)?;
      Ok((id, match_entity_type(&type_str)))
    })
    .map_err(|e| e.to_string())?
    .collect::<rusqlite::Result<Vec<_>>>()
    .map_err(|e| e.to_string())?;

  Ok(data)
}
