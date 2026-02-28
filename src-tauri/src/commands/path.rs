use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_posters_dir(app: AppHandle) -> Result<String, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push("posters");

    print!("Posters path : {:?} ", path);

    path.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Échec de la conversion du chemin en texte".to_string())
}
