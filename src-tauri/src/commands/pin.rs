use rusqlite::params;

use crate::{
    db::DbState,
    models::{
        enums::{match_collection_media_type, CollectionMediaType},
        pin::PinEntry,
    },
};

// convert SQL -> PinEntry
pub fn map_row_to_pin_entry(row: &rusqlite::Row) -> rusqlite::Result<PinEntry> {
    // data that has to be transformed
    let context_str: String = row.get(1)?;

    Ok(PinEntry {
        collection_id: row.get(0)?,
        context: match_collection_media_type(&context_str),
        position: row.get(2)?,
    })
}

/* get */

#[tauri::command]
pub fn get_all_pins(state: tauri::State<'_, DbState>) -> Result<Vec<PinEntry>, String> {
    println!("get_all_pins");

    let connection = state
        .connection
        .lock()
        .map_err(|_| "Failed to lock database")?;

    let mut stmt = connection
        .prepare(
            "SELECT collection_id, context, position 
      FROM pinned_collection 
      ORDER BY position ASC",
        )
        .map_err(|e| e.to_string())?;

    let pins = stmt
        .query_map([], |row| map_row_to_pin_entry(row))
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<PinEntry>>>()
        .map_err(|e| e.to_string())?;

    Ok(pins)
}

/* add */

#[tauri::command]
pub fn pin_collection(
    state: tauri::State<'_, DbState>,
    collection_id: String,
    context: CollectionMediaType,
) -> Result<(), String> {
    let connection = state
        .connection
        .lock()
        .map_err(|_| "Failed to lock database")?;

    let context_str = context.to_db_string();

    // check if already pinned
    let already_exists: bool = connection.query_row(
    "SELECT EXISTS(SELECT 1 FROM pinned_collection WHERE context = ?1 AND collection_id = ?2)",
    params![context_str, collection_id],
    |row| row.get(0),
  ).map_err(|e| e.to_string())?;
    if already_exists {
        return Ok(());
    }

    // determine the position
    let count: i32 = connection
        .query_row(
            "SELECT COUNT(*) FROM pinned_collection WHERE context = ?1",
            params![context_str],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if count >= 16 {
        return Err("Maximum of 16 pinned collections reached for this context".to_string());
    }

    // insert at the right position
    connection
        .execute(
            "INSERT INTO pinned_collection (context, position, collection_id) VALUES (?1, ?2, ?3)",
            params![context_str, count, collection_id],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

/* update */

#[tauri::command]
pub fn update_pinned_collections(
    state: tauri::State<'_, DbState>,
    collection_ids: Vec<String>,
    context: CollectionMediaType,
) -> Result<(), String> {
    let mut connection = state
        .connection
        .lock()
        .map_err(|_| "Failed to lock database")?;
    let tx = connection.transaction().map_err(|e| e.to_string())?;

    let context_str = context.to_db_string();

    // delete old position
    tx.execute(
        "DELETE FROM pinned_collection WHERE context = ?1",
        [&context_str],
    )
    .map_err(|e| e.to_string())?;

    // insert new position
    for (index, id) in collection_ids.iter().take(16).enumerate() {
        tx.execute(
            "INSERT INTO pinned_collection (context, position, collection_id) VALUES (?1, ?2, ?3)",
            params![context_str, index as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    println!("Pinned collections updated for context: {}", context);
    Ok(())
}

/* delete */

#[tauri::command]
pub fn unpin_collection(
    state: tauri::State<'_, DbState>,
    collection_id: String,
    context: CollectionMediaType,
) -> Result<(), String> {
    let mut connection = state
        .connection
        .lock()
        .map_err(|_| "Failed to lock database")?;
    let tx = connection.transaction().map_err(|e| e.to_string())?;

    let context_str = context.to_db_string();

    // delete from pinned
    tx.execute(
        "DELETE FROM pinned_collection WHERE context = ?1 AND collection_id = ?2",
        params![context_str, collection_id],
    )
    .map_err(|e| e.to_string())?;

    // retrieve remaining pinned ids
    let ids: Vec<String> = {
        let mut stmt = tx.prepare(
      "SELECT collection_id FROM pinned_collection WHERE context = ?1 ORDER BY position ASC"
    ).map_err(|e| e.to_string())?;

        let collected = stmt
            .query_map([&context_str], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .collect::<rusqlite::Result<Vec<String>>>()
            .map_err(|e| e.to_string())?;

        collected
    };

    // update each pinned collection with their new position
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE pinned_collection SET position = ?1 WHERE context = ?2 AND collection_id = ?3",
            params![index as i32, context_str, id],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}
