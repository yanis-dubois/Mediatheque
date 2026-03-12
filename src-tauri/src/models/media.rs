use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::enums::{MediaStatus, MediaType};
use crate::models::{enums::TagType, metadata::Tag};

/* ****** Relation ****** */

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct EntityRelation {
  pub id: String,
  pub values: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryMediaRelations {
  pub persons: HashMap<String, EntityRelation>,
  pub companies: HashMap<String, EntityRelation>,
  pub tags: HashMap<TagType, Vec<Tag>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiMediaRelations {
  pub persons: HashMap<String, Vec<String>>,
  pub companies: HashMap<String, Vec<String>>,
  pub tags: HashMap<TagType, Vec<String>>,
}

/* ****** Data ****** */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaBase {
  pub media_type: MediaType,
  pub title: String,
  pub release_date: String,
  pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MediaExtension {
  Movie {
    duration: i32,
  },
  Series {
    seasons: i32,
    episodes: i32,
  },
  Game {
    player_count: String,
    playing_time: String,
  },
  None,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaData {
  #[serde(flatten)]
  pub base: MediaBase,
  #[serde(flatten)]
  pub extension: MediaExtension,
}

/* ****** State ****** */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryState {
  pub id: String, // UUID
  pub external_id: u32,
  pub added_date: String,
  pub status: MediaStatus,
  pub favorite: bool,
  pub notes: String,
  pub score: Option<u32>,
  pub has_poster: bool,
  pub has_backdrop: bool,
  pub poster_width: u32,
  pub poster_height: u32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiState {
  pub external_id: u32,
  pub is_in_library: bool,
  pub poster_path: Option<String>,
  pub backdrop_path: Option<String>,
}

/* ****** Type ****** */

// obtained from light API call
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiSearchResult {
  #[serde(flatten)]
  pub core: MediaBase,
  #[serde(flatten)]
  pub state: ApiState,
}

// obtained from detailed API call
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiMedia {
  #[serde(flatten)]
  pub data: MediaData,
  #[serde(flatten)]
  pub relations: ApiMediaRelations,
  #[serde(flatten)]
  pub state: ApiState,
}

// obtained from SQL call
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryMedia {
  #[serde(flatten)]
  pub data: MediaData,
  #[serde(flatten)]
  pub relations: LibraryMediaRelations,
  #[serde(flatten)]
  pub state: LibraryState,
}
