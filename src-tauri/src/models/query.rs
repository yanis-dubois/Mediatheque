use serde::{Deserialize, Serialize};
use crate::models::enums::{MediaOrderDirection, MediaOrderField};

use super::enums::{MediaType, MediaStatus};

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MediaFilter {
  pub collection_id: Option<String>, // for manual collection
  pub media_type: Option<MediaType>,
  pub status: Option<MediaStatus>,
  pub favorite_only: Option<bool>,
  pub search_query: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaOrder {
  pub field: MediaOrderField,
  pub direction: MediaOrderDirection,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
  pub limit: i32,
  pub offset: i32,
}
