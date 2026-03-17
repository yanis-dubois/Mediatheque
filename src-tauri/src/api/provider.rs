use crate::{
  api::tmdb::TmdbProvider,
  models::{
    enums::{Language, MediaType},
    image::{ImageSize, ImageType},
    media::{ApiMedia, ApiSearchResult},
  },
};

#[async_trait::async_trait]
pub trait MediaProvider: Send + Sync {
  fn get_image_url(&self, path: &str, image_type: ImageType, size: ImageSize) -> String;
  fn get_image_format(&self) -> &str;
  async fn search(&self, query: &str, language: Language) -> Result<Vec<ApiSearchResult>, String>;
  async fn get_by_id(&self, external_id: u32, language: Language) -> Result<ApiMedia, String>;
}

pub fn get_provider(media_type: &MediaType) -> Box<dyn MediaProvider + Send + Sync> {
  match media_type {
    MediaType::Movie | MediaType::Series => Box::new(TmdbProvider::new(media_type.clone())),
    _ => todo!(),
  }
}
