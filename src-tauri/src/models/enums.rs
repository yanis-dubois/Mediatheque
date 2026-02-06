use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, PartialEq)]
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

#[derive(Debug, Serialize, Deserialize, PartialEq)]
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



#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum CollectionType {
  #[default]
  Manual,
  Dynamic
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum CollectionMediaType {
  #[default]
  All,
  Specific(MediaType),
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum CollectionView {
  #[default]
  Grid,
  Row,
  Column
}



#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum MediaOrderField {
  #[default]
  AddedDate,
  ReleaseDate,
  MediaType,
  Favorite,
  Status
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum MediaOrderDirection {
  #[default]
  Asc,
  Desc
}
