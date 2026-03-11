use super::enums::{MediaStatus, MediaType};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Descriptor {
  pub id: i32,
  pub name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Media {
  pub id: String,
  pub external_id: i32,
  pub media_type: MediaType,

  pub poster_width: u32,
  pub poster_height: u32,

  pub title: String,
  pub description: String,

  pub release_date: String,
  pub added_date: String,

  pub status: MediaStatus,
  pub favorite: bool,
  pub notes: String,
  pub score: Option<u32>,

  pub has_poster: bool,
  pub has_backdrop: bool,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum AnyMedia {
  Movie(Movie),
  Series(Series),
  TabletopGame(TabletopGame),
  // add other media type

  // fallback
  Base(Media),
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Movie {
  #[serde(flatten)]
  // media common fields
  pub base: Media,

  // movie specific fields
  pub directors: Vec<Descriptor>,
  pub genre: Vec<Descriptor>,
  pub saga: Vec<Descriptor>,
  pub duration: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Series {
  #[serde(flatten)]
  // media common fields
  pub base: Media,

  // series specific fields
  pub creators: Vec<Descriptor>,
  pub genre: Vec<Descriptor>,
  pub seasons: i32,
  pub episodes: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TabletopGame {
  #[serde(flatten)]
  // media common fields
  pub base: Media,

  // series specific fields
  pub designers: Vec<Descriptor>,
  pub artists: Vec<Descriptor>,
  pub publishers: Vec<Descriptor>,
  pub game_mechanics: Vec<Descriptor>,
  pub player_count: String,
  pub playing_time: String,
}
