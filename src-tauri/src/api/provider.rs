use std::collections::HashMap;

use crate::{
  api::{igdb::IgdbProvider, tmdb::TmdbProvider},
  models::{
    enums::{Language, MediaSource, MediaType},
    image::{ImageConfiguration, ImageSize, ImageType},
    media::{ApiMedia, ApiSearchResult},
  },
};

pub struct ProviderStore {
  pub providers: HashMap<(MediaType, MediaSource), Box<dyn MediaProvider + Send + Sync>>,
}

impl ProviderStore {
  pub fn new() -> Self {
    let mut providers: HashMap<(MediaType, MediaSource), Box<dyn MediaProvider + Send + Sync>> =
      HashMap::new();

    // Init providers at app launch
    providers.insert(
      (MediaType::VideoGame, MediaSource::Igdb),
      Box::new(IgdbProvider::new()),
    );
    providers.insert(
      (MediaType::Movie, MediaSource::Tmdb),
      Box::new(TmdbProvider::new(MediaType::Movie)),
    );
    providers.insert(
      (MediaType::Series, MediaSource::Tmdb),
      Box::new(TmdbProvider::new(MediaType::Series)),
    );

    Self { providers }
  }

  pub fn get(
    &self,
    media_type: &MediaType,
    source: &MediaSource,
  ) -> Option<&(dyn MediaProvider + Send + Sync)> {
    self
      .providers
      .get(&(media_type.clone(), source.clone()))
      .map(|p| p.as_ref())
  }

  pub fn get_default(&self, media_type: &MediaType) -> Option<&(dyn MediaProvider + Send + Sync)> {
    let source = match media_type {
      MediaType::VideoGame => MediaSource::Igdb,
      MediaType::Movie | MediaType::Series => MediaSource::Tmdb,
      _ => return None,
    };
    self.get(media_type, &source)
  }
}

#[async_trait::async_trait]
pub trait MediaProvider: Send + Sync {
  fn create_config() -> ImageConfiguration
  where
    Self: Sized;
  fn get_image_config(&self) -> &ImageConfiguration;
  async fn search(
    &self,
    query: &str,
    language: Language,
    page: u32,
  ) -> Result<Vec<ApiSearchResult>, String>;
  async fn get_by_id(&self, external_id: u32, language: Language) -> Result<ApiMedia, String>;

  fn get_image_url(&self, path: &str, image_type: ImageType, size: ImageSize) -> String {
    let config = self.get_image_config();

    let size_str = config
      .sizes
      .get(&image_type)
      .and_then(|type_sizes| type_sizes.get(&size))
      .map(|s| s.as_str())
      .unwrap_or("original");

    let clean_path = path.trim_start_matches('/');

    format!(
      "{}/{}/{}.{}",
      config.base_url, size_str, clean_path, config.format
    )
  }

  fn get_image_format(&self) -> &str {
    &self.get_image_config().format
  }
}
