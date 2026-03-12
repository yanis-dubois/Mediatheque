use crate::models::enums::{MediaOrderDirection, MediaOrderField, TagType};
use serde::{Deserialize, Serialize};

use super::enums::{MediaStatus, MediaType};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaFilter {
  // manual collection
  pub collection_id: Option<String>,

  // generic field
  pub media_type: Option<MediaType>,
  pub status: Option<MediaStatus>,
  pub favorite_only: Option<bool>,
  pub title: Option<String>,
  pub search_query: Option<String>,

  // specific filed
  pub person: Option<String>,
  pub company: Option<String>,
  pub tag: Option<(TagType, String)>,
  // [...]
  // TODO: not realy usefull so ...
  // release_date
  // added_date
  // duration
  // seasons
  // episodes

  // metadata collection
  pub person_id: Option<u32>,
  pub company_id: Option<u32>,
  pub saga_id: Option<u32>,
  pub genre_id: Option<u32>,
  pub game_mechanic_id: Option<u32>,
}

impl Default for MediaFilter {
  fn default() -> Self {
    Self {
      collection_id: None,

      media_type: None,
      status: None,
      favorite_only: None,
      title: None,
      search_query: None,

      person: None,
      company: None,
      tag: None,

      person_id: None,
      company_id: None,
      saga_id: None,
      genre_id: None,
      game_mechanic_id: None,
    }
  }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MediaOrder {
  pub field: MediaOrderField,
  pub direction: MediaOrderDirection,
}
