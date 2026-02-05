use serde::Deserialize;
use super::enums::{MediaType, MediaStatus};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaFilter {
  pub media_type: Option<MediaType>,
  pub status: Option<MediaStatus>,
  pub favorite_only: Option<bool>,
  pub search_query: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaOrder {
  pub field: String,      // "added_date", "release_date", "media_type", "favorite", "status"
  pub direction: String,  // "ASC" / "DESC"
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
  pub limit: i32,
  pub offset: i32,
}
