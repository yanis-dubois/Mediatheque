use serde::{Deserialize, Serialize};
use strum::EnumIter;

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter)]
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
  Dynamic,
  System,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter)]
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
  List,
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
  Episodes,

  Designers,
  Artists,
  GameMechanic,
  Publishers,
  PlayerCount,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum MediaOrderDirection {
  #[default]
  Asc,
  Desc,
}

// convert SQL TEXT -> Enums
pub fn match_media_type(s: &str) -> MediaType {
  match s {
    "BOOK" => MediaType::Book,
    "SERIES" => MediaType::Series,
    "VIDEO_GAME" => MediaType::VideoGame,
    "TABLETOP_GAME" => MediaType::TabletopGame,
    _ => MediaType::Movie, // default
  }
}
pub fn match_media_status(s: &str) -> MediaStatus {
  match s {
    "IN_PROGRESS" => MediaStatus::InProgress,
    "FINISHED" => MediaStatus::Finished,
    "DROPPED" => MediaStatus::Dropped,
    _ => MediaStatus::ToDiscover, // default
  }
}
pub fn match_collection_media_type(s: &str) -> CollectionMediaType {
  match s {
    "ALL" => CollectionMediaType::All,
    _ => CollectionMediaType::Specific(match_media_type(s)),
  }
}
pub fn match_collection_type(s: &str) -> CollectionType {
  match s {
    "DYNAMIC" => CollectionType::Dynamic,
    "MANUAL" => CollectionType::Manual,
    "SYSTEM" => CollectionType::System,
    _ => CollectionType::Manual, // default
  }
}
pub fn match_collection_view(s: &str) -> CollectionLayout {
  match s {
    "GRID" => CollectionLayout::Grid,
    "ROW" => CollectionLayout::Row,
    "COLUMN" => CollectionLayout::Column,
    "LIST" => CollectionLayout::List,
    _ => CollectionLayout::Grid,
  }
}
