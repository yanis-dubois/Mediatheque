use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
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

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
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



#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum CollectionType {
  #[default]
  Manual,
  Dynamic
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(tag = "type", content = "value", rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum CollectionMediaType {
  #[default]
  All,
  Specific(MediaType),
}

impl CollectionMediaType {
  pub fn to_db_string(&self) -> String {
    match self {
      CollectionMediaType::All => "ALL".to_string(),
      CollectionMediaType::Specific(media) => media.to_string().to_uppercase(),
    }
  }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum CollectionLayout {
  #[default]
  Grid,
  Row,
  Column,
  List
}



#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Copy)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum MediaOrderField {
  #[default]
  Title,
  AddedDate,
  ReleaseDate,
  MediaType,
  Favorite,
  Status,

  Directors,
  Genre,
  Serie,
  Duration,
  Creators,
  Seasons,
  Episodes
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
