use serde::{Deserialize, Serialize};

use crate::models::enums::MediaType;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiSearchResult {
  pub id: u32,
  pub title: String,
  pub release_date: String,
  pub media_type: MediaType,
  pub poster_path: Option<String>,
  pub overview: String,
  pub is_in_library: bool,
}

#[derive(Deserialize)]
pub struct ApiResponse {
  pub results: Vec<serde_json::Value>,
}
