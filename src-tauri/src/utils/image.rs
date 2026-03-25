use std::path::PathBuf;

use image::ImageReader;
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

  // download lods if available
  if provider.supports_native_lods() {
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

    // download in parallel
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
  // generate lods if necessary
  else {
    // download in temp file
    let format = provider.get_image_format();
    let temp_path = base_target_dir.join(format!("temp_{}.{}", id, format));
    let source_url = provider.get_image_url(api_path, image_type, ImageSize::Original);
    download_file(&source_url, temp_path.clone()).await?;

    // get image size
    let img = ImageReader::open(&temp_path)
      .map_err(|e| e.to_string())?
      .decode()
      .map_err(|e| e.to_string())?;
    let width = img.width();
    let height = img.height();

    // define target directory
    let original_dir = base_target_dir.join("original");
    let medium_dir = base_target_dir.join("medium");
    let small_dir = base_target_dir.join("small");
    for dir in [&original_dir, &medium_dir, &small_dir] {
      std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }

    let filename = format!("{}.{}", id, format);
    let medium_width = if image_type == ImageType::Poster {
      272
    } else {
      1280
    };
    let small_width = if image_type == ImageType::Poster {
      92
    } else {
      384
    };

    let img_arc = std::sync::Arc::new(img);
    let mut tasks = Vec::new();

    // image is high resolution
    if width > 2 * medium_width {
      std::fs::rename(&temp_path, original_dir.join(&filename)).map_err(|e| e.to_string())?;

      let img_m = img_arc.clone();
      let path_m = medium_dir.join(&filename);
      tasks.push(tokio::task::spawn_blocking(move || {
        img_m
          .resize(
            medium_width,
            u32::MAX,
            image::imageops::FilterType::Lanczos3,
          )
          .save(path_m)
          .map_err(|e| e.to_string())
      }));

      let img_s = img_arc.clone();
      let path_s = small_dir.join(&filename);
      tasks.push(tokio::task::spawn_blocking(move || {
        img_s
          .resize(small_width, u32::MAX, image::imageops::FilterType::Lanczos3)
          .save(path_s)
          .map_err(|e| e.to_string())
      }));
    }
    // image is medium resolution
    else if width > 2 * small_width {
      std::fs::rename(&temp_path, medium_dir.join(&filename)).map_err(|e| e.to_string())?;

      let img_s = img_arc.clone();
      let path_s = small_dir.join(&filename);
      tasks.push(tokio::task::spawn_blocking(move || {
        img_s
          .resize(small_width, u32::MAX, image::imageops::FilterType::Lanczos3)
          .save(path_s)
          .map_err(|e| e.to_string())
      }));
    }
    // image is low resolution
    else {
      std::fs::rename(&temp_path, small_dir.join(&filename)).map_err(|e| e.to_string())?;
    }

    let dims = if extract_dims {
      Some((width, height))
    } else {
      None
    };

    Ok((true, dims))
  }
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
