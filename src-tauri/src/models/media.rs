use serde::Serialize;
use super::enums::{MediaType, MediaStatus};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Media {
  pub id: i32,
  pub media_type: MediaType,

  pub title: String,
  pub image_url: String,
  pub description: String,

  pub release_date: String,
  pub added_date: String,

  pub status: MediaStatus,
  pub favorite: bool,
  pub notes: String,
}
