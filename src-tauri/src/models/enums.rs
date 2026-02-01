use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MediaType {
  Book,
  Movie,
  TvShow,
  VideoGame,
  TabletopGame,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MediaStatus {
  ToDiscover,
  InProgress,
  Finished,
  Dropped,
}
