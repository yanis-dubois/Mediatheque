use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum MediaType {
  Book,
  #[default]
  Movie,
  Series,
  VideoGame,
  TabletopGame,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum MediaStatus {
  #[default]
  ToDiscover,
  InProgress,
  Finished,
  Dropped,
}
