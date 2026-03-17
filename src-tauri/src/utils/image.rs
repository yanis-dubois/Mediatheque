use std::path::PathBuf;

use tauri::Manager;

use crate::{
  api::provider::MediaProvider,
  models::image::{ImageSize, ImageType},
};

pub struct DownloadedMediaAssets {
  pub poster_width: u32,
  pub poster_height: u32,
  pub has_poster: bool,
  pub has_backdrop: bool,
}

/* ADD */

async fn download_file(url: &str, dest_path: PathBuf) -> Result<(), String> {
  // download
  let response = reqwest::get(url)
    .await
    .map_err(|e| format!("Network error: {}", e))?;
  let bytes = response
    .bytes()
    .await
    .map_err(|e| format!("Failed to read bytes: {}", e))?;

  // create folder if needed
  if let Some(parent) = dest_path.parent() {
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  // write files
  std::fs::write(dest_path, bytes).map_err(|e| e.to_string())?;

  Ok(())
}

async fn download_image_lods(
  provider: &(dyn MediaProvider + Send + Sync),
  image_type: ImageType,
  base_target_dir: &PathBuf,
  id: &str,
  api_path: &str,
  extract_dims: bool,
) -> Result<(bool, Option<(u32, u32)>), String> {
  let variants = [
    ("small", ImageSize::Small),
    ("medium", ImageSize::Medium),
    ("original", ImageSize::Original),
  ];

  // create 'future' for each LoDs
  let mut tasks = Vec::new();
  for (folder_name, size_type) in variants {
    let url = provider.get_image_url(api_path, image_type, size_type);
    let dest =
      base_target_dir
        .join(folder_name)
        .join(format!("{}.{}", id, provider.get_image_format()));

    tasks.push(async move {
      download_file(&url, dest.clone())
        .await
        .map(|_| (size_type, dest))
    });
  }

  // execute in parallel
  let results = futures::future::join_all(tasks).await;

  let mut dims = None;
  let mut success = false;

  // treat results
  for res in results {
    let (size_type, dest) = res?;
    success = true;

    if extract_dims && matches!(size_type, ImageSize::Original) {
      if let Ok(size) = imagesize::size(&dest) {
        dims = Some((size.width as u32, size.height as u32));
      }
    }
  }

  Ok((success, dims))
}

pub async fn download_assets(
  app: &tauri::AppHandle,
  provider: &(dyn MediaProvider + Send + Sync),
  id: &str,
  poster_path: Option<String>,
  backdrop_path: Option<String>,
) -> Result<DownloadedMediaAssets, String> {
  let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

  // create 'future' for poster
  let poster_future = async {
    if let Some(path) = poster_path {
      let (success, dims) = download_image_lods(
        provider,
        ImageType::Poster,
        &app_dir.join("posters"),
        id,
        &path,
        true,
      )
      .await?;
      Ok::<(bool, (u32, u32)), String>((success, dims.unwrap_or((2, 3))))
    } else {
      Ok((false, (2, 3)))
    }
  };

  // create 'future' for backdrop
  let backdrop_future = async {
    if let Some(path) = backdrop_path {
      let (success, _) = download_image_lods(
        provider,
        ImageType::Backdrop,
        &app_dir.join("backdrops"),
        id,
        &path,
        false,
      )
      .await?;
      Ok::<bool, String>(success)
    } else {
      Ok(false)
    }
  };

  // execute in parallel
  let (poster_res, backdrop_res) = futures::join!(poster_future, backdrop_future);

  let (has_poster, poster_dims) = poster_res?;
  let has_backdrop = backdrop_res?;

  Ok(DownloadedMediaAssets {
    poster_width: poster_dims.0,
    poster_height: poster_dims.1,
    has_poster,
    has_backdrop,
  })
}

/* DELETE */

pub fn delete_media_files(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
  let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

  let categories = ["posters", "backdrops"];
  let sizes = ["small", "medium", "original"];
  let extensions = ["jpg", "jpeg", "png", "webp"];

  for category in categories {
    for size in sizes {
      let folder_path = app_dir.join(category).join(size);

      for ext in extensions {
        let file_path = folder_path.join(format!("{}.{}", id, ext));
        if file_path.exists() {
          std::fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete file {:?}: {}", file_path, e))?;
        }
      }
    }
  }
  Ok(())
}
