use serde::{Deserialize, Serialize};
use crate::models::enums::{MediaOrderDirection, MediaOrderField};

use super::enums::{MediaType, MediaStatus};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaFilter {
  // manual collection
  pub collection_id: Option<String>, 

  // generic field
  pub media_type: Option<MediaType>,
  pub status: Option<MediaStatus>,
  pub favorite_only: Option<bool>,
  pub search_query: Option<String>,

  // specific filed
  pub person: Option<String>,
  pub genres: Option<Vec<String>>,
  pub serie: Option<String>, // TODO
  // [...]

  // TODO: not realy usefull so ...
  // release_date
  // added_date
  // duration
  // seasons
  // episodes
}

impl Default for MediaFilter {
  fn default() -> Self {
    Self {
      collection_id: None,
      media_type: None,
      status: None,
      favorite_only: None,
      search_query: None,

      person: None,
      genres: None,
      serie: None,
    }
  }
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
