use super::enums::{MediaStatus, MediaType};
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Media {
  pub id: String,
  pub media_type: MediaType,

  pub image_width: u32,
  pub image_height: u32,

  pub title: String,
  pub description: String,

  pub release_date: String,
  pub added_date: String,

  pub status: MediaStatus,
  pub favorite: bool,
  pub notes: String,
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
  pub directors: Vec<String>,
  pub genre: Vec<String>,
  pub serie: Option<String>,
  pub duration: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Series {
  #[serde(flatten)]
  // media common fields
  pub base: Media,

  // series specific fields
  pub creators: Vec<String>,
  pub genre: Vec<String>,
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
  pub designers: Vec<String>,
  pub artists: Vec<String>,
  pub publishers: Vec<String>,
  pub game_mechanics: Vec<String>,
  pub player_count: String,
  pub playing_time: String,
}
