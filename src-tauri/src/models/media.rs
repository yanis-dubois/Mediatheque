use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::enums::{MediaStatus, MediaType};
use crate::models::{
  enums::{MediaPossessionStatus, MediaSource, TagType},
  metadata::Tag,
};

/* ****** Relation ****** */

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LibraryEntityRelation {
  pub id: String,
  pub order: Option<u32>,
  pub values: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ApiEntityRelation {
  pub order: Option<u32>,
  pub values: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryMediaRelations {
  pub persons: HashMap<String, LibraryEntityRelation>,
  pub cast: HashMap<String, LibraryEntityRelation>,
  pub companies: HashMap<String, LibraryEntityRelation>,
  pub tags: HashMap<TagType, Vec<Tag>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiMediaRelations {
  pub persons: HashMap<String, ApiEntityRelation>,
  pub cast: HashMap<String, ApiEntityRelation>,
  pub companies: HashMap<String, ApiEntityRelation>,
  pub tags: HashMap<TagType, Vec<String>>,
}

/* ****** Data ****** */

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaBase {
  pub media_type: MediaType,
  pub source: MediaSource,
  pub title: String,
  pub release_date: String,
  pub description: String,
  pub creators: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MediaExtension {
  Movie {
    duration: Option<u32>,
  },
  Series {
    seasons: Option<u32>,
    episodes: Option<u32>,
  },
  TabletopGame {
    #[serde(rename = "minPlayers")]
    min_players: Option<u32>,
    #[serde(rename = "maxPlayers")]
    max_players: Option<u32>,
    #[serde(rename = "minPlayingTime")]
    min_playing_time: Option<u32>,
    #[serde(rename = "maxPlayingTime")]
    max_playing_time: Option<u32>,
  },
  VideoGame {
    synopsis: Option<String>,
    #[serde(rename = "normalPlayingTime")]
    normal_playing_time: Option<u32>,
    #[serde(rename = "completePlayingTime")]
    complete_playing_time: Option<u32>,
  },
  Book {
    pages: Option<u32>,
    category: Option<String>, // Book, Novel, ...
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
  pub external_id: Option<u32>,
  pub added_date: String,
  pub status: MediaStatus,
  pub possession_status: MediaPossessionStatus,
  pub status_update: String,
  pub possession_status_update: String,
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
  pub id: Option<String>,
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
  pub base: MediaBase,
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

// used to recieve data from frontend while editing a media
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDto {
  #[serde(flatten)]
  pub base: MediaBase,
  #[serde(flatten)]
  pub relations: ApiMediaRelations,

  // flatten extension fields
  pub duration: Option<u32>,              // Movie
  pub seasons: Option<u32>,               // Series
  pub episodes: Option<u32>,              // Series
  pub synopsis: Option<String>,           // VideoGame
  pub normal_playing_time: Option<u32>,   // VideoGame
  pub complete_playing_time: Option<u32>, // VideoGame
  pub min_players: Option<u32>,           // Tabletop
  pub max_players: Option<u32>,           // Tabletop
  pub min_playing_time: Option<u32>,      // Tabletop
  pub max_playing_time: Option<u32>,      // Tabletop
  pub pages: Option<u32>,                 // Book
  pub category: Option<String>,           // Book
}

impl MediaDto {
  // build structured extension from flat data
  pub fn build_extension(self) -> MediaExtension {
    match self.base.media_type {
      MediaType::Movie => MediaExtension::Movie {
        duration: self.duration,
      },
      MediaType::Series => MediaExtension::Series {
        seasons: self.seasons,
        episodes: self.episodes,
      },
      MediaType::VideoGame => MediaExtension::VideoGame {
        synopsis: self.synopsis,
        normal_playing_time: self.normal_playing_time,
        complete_playing_time: self.complete_playing_time,
      },
      MediaType::Book => MediaExtension::Book {
        pages: self.pages,
        category: self.category,
      },
      MediaType::TabletopGame => MediaExtension::TabletopGame {
        min_players: self.min_players,
        max_players: self.max_players,
        min_playing_time: self.min_playing_time,
        max_playing_time: self.max_playing_time,
      },
    }
  }
}
