use std::path::{Path, PathBuf};

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

async fn process_local_image_lods(
  source_path: &Path,
  image_type: ImageType,
  base_target_dir: &Path,
  id: &str,
  extract_dims: bool,
) -> Result<(bool, Option<(u32, u32)>), String> {
  let filename = format!("{}.jpg", id);

  // load image
  let img = ImageReader::open(source_path)
    .map_err(|e| e.to_string())?
    .decode()
    .map_err(|e| e.to_string())?;

  // get size
  let width = img.width();
  let height = img.height();
  let min_dim = std::cmp::min(width, height);

  // define target directory
  let original_dir = base_target_dir.join("original");
  let medium_dir = base_target_dir.join("medium");
  let small_dir = base_target_dir.join("small");
  for dir in [&original_dir, &medium_dir, &small_dir] {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
  }

  let target_medium = if image_type == ImageType::Poster {
    272
  } else {
    720
  };
  let target_small = if image_type == ImageType::Poster {
    92
  } else {
    240
  };
  // width and height depends on image format (portrait / landscape)
  let is_portrait = width < height;
  let (medium_width, medium_height) = if is_portrait {
    (target_medium, u32::MAX)
  } else {
    (u32::MAX, target_medium)
  };
  let (small_width, small_height) = if is_portrait {
    (target_small, u32::MAX)
  } else {
    (u32::MAX, target_small)
  };

  let original_dyn = image::DynamicImage::ImageRgb8(img.to_rgb8());

  // image is high resolution
  if min_dim > 2 * target_medium {
    // save original (while converting in jpg)
    let img_o = original_dyn.clone();
    let path_o = original_dir.join(&filename);
    tokio::task::spawn_blocking(move || img_o.save(path_o))
      .await
      .unwrap()
      .map_err(|e| e.to_string())?;

    // 2. Créer le Medium à partir de l'Original
    let medium_img = original_dyn.resize(
      medium_width,
      medium_height,
      image::imageops::FilterType::CatmullRom,
    );
    let path_m = medium_dir.join(&filename);
    medium_img.save(&path_m).map_err(|e| e.to_string())?;

    // 3. Créer le Small à partir du MEDIUM (Beaucoup plus rapide !)
    let small_img = medium_img.resize(
      small_width,
      small_height,
      image::imageops::FilterType::CatmullRom,
    );
    let path_s = small_dir.join(&filename);
    small_img.save(path_s).map_err(|e| e.to_string())?;
  }
  // image is medium resolution
  else if min_dim > 2 * target_small {
    // save original as medium (converting in jpg)
    let path_m = medium_dir.join(&filename);
    original_dyn.save(&path_m).map_err(|e| e.to_string())?;

    let small_img = original_dyn.resize(
      small_width,
      small_height,
      image::imageops::FilterType::CatmullRom,
    );
    let path_s = small_dir.join(&filename);
    small_img.save(path_s).map_err(|e| e.to_string())?;
  }
  // image is low resolution
  else {
    // save original as medium (converting in jpg)
    let path_s = small_dir.join(&filename);
    original_dyn.save(path_s).map_err(|e| e.to_string())?;
  }

  let dims = if extract_dims {
    Some((width, height))
  } else {
    None
  };

  Ok((true, dims))
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

    // generate LODs
    let result =
      process_local_image_lods(&temp_path, image_type, base_target_dir, id, extract_dims).await;
    let _ = std::fs::remove_file(temp_path);

    result
  }
}

pub async fn download_assets_from_api(
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

pub async fn download_assets_from_local(
  app: &tauri::AppHandle,
  id: &str,
  previous_state: &DownloadedMediaAssets,
  poster_path: Option<String>,
  backdrop_path: Option<String>,
  poster_deleted: bool,
  backdrop_deleted: bool,
) -> Result<DownloadedMediaAssets, String> {
  let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

  // POSTER
  let poster_base_dir = app_dir.join("posters");
  let mut final_poster_dims = (previous_state.poster_width, previous_state.poster_height);
  let mut final_has_poster = previous_state.has_poster;

  // delete last image and LODs
  if poster_deleted || poster_path.is_some() {
    delete_images(app, id, ImageType::Poster)?;
    final_has_poster = false;
  }
  // load new image and create LODs
  if let Some(path_str) = poster_path {
    let source_path = Path::new(&path_str);
    if source_path.exists() {
      let (success, dims) = process_local_image_lods(
        source_path,
        ImageType::Poster,
        &poster_base_dir,
        &id,
        true, // On extrait les dimensions pour le poster
      )
      .await?;

      final_has_poster = success;
      if let Some(d) = dims {
        final_poster_dims = d;
      }
    }
  }

  // BACKDROP
  let backdrop_base_dir = app_dir.join("backdrops");
  let mut final_has_backdrop = previous_state.has_backdrop;

  // delete last image and LODs
  if backdrop_deleted || backdrop_path.is_some() {
    delete_images(app, id, ImageType::Backdrop)?;
    final_has_backdrop = false;
  }
  // load new image and create LODs
  if let Some(path_str) = backdrop_path {
    let source_path = Path::new(&path_str);
    if source_path.exists() {
      let (success, _) = process_local_image_lods(
        source_path,
        ImageType::Backdrop,
        &backdrop_base_dir,
        &id,
        false,
      )
      .await?;
      final_has_backdrop = success;
    }
  }

  Ok(DownloadedMediaAssets {
    poster_width: final_poster_dims.0,
    poster_height: final_poster_dims.1,
    has_poster: final_has_poster,
    has_backdrop: final_has_backdrop,
  })
}

/* DELETE */

fn delete_images(app: &tauri::AppHandle, id: &str, category: ImageType) -> Result<(), String> {
  let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

  let category_folder_name = match category {
    ImageType::Poster => "posters",
    ImageType::Backdrop => "backdrops",
  };
  let sizes = ["small", "medium", "original"];
  let extensions = ["jpg", "jpeg", "png", "webp"];

  for size in sizes {
    let folder_path = app_dir.join(category_folder_name).join(size);

    for ext in extensions {
      let file_path = folder_path.join(format!("{}.{}", id, ext));
      if file_path.exists() {
        std::fs::remove_file(&file_path)
          .map_err(|e| format!("Failed to delete file {:?}: {}", file_path, e))?;
      }
    }
  }

  Ok(())
}

pub fn delete_media_files(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
  delete_images(app, id, ImageType::Poster)?;
  delete_images(app, id, ImageType::Backdrop)?;
  Ok(())
}
