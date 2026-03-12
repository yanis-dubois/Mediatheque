use serde::{Deserialize, Serialize};
use strum::EnumIter;

/* Settings */

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum SettingsKey {
  Language,
  ScoreDisplayMode,
  Theme,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(untagged)]
#[derive(strum::Display)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum SettingValue {
  Language(Language),
  ScoreMode(ScoreDisplayMode),
  Theme(Theme),
}

impl SettingValue {
  pub fn to_db_string(&self) -> String {
    match self {
      SettingValue::Language(mode) => mode.to_string(),
      SettingValue::ScoreMode(mode) => mode.to_string(),
      SettingValue::Theme(mode) => mode.to_string(),
    }
  }
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum Language {
  En,
  Fr,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum Theme {
  Light,
  Dark,
  System,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum ScoreDisplayMode {
  Hidden,
  Percent,
  Stars,
  ThreeStep,
  FiveStep,
}

/* Media */

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

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, Eq, Hash)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum TagType {
  #[default]
  Genre,
  Saga,
  GameMechanic,
}

/* Media Query */

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
  Score,

  // person
  Director,
  Creator,
  Designer,
  Artist,

  // company
  Publisher,

  // tag
  Genre,
  Saga,
  GameMechanic,

  // specific field
  Duration,
  Seasons,
  Episodes,
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

/* Collection */

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

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum EntityType {
  #[default]
  Media,
  Collection,
  Person,
  Company,
  Saga,
  Genre,
  GameMechanic,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
#[derive(Default)]
pub enum MetadataType {
  #[default]
  Person,
  Company,
  Saga,
  Genre,
  GameMechanic,
}

/* Convertion */

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
pub fn match_tag_type(s: &str) -> TagType {
  match s {
    "GENRE" => TagType::Genre,
    "SAGA" => TagType::Saga,
    "GAME_MECHANIC" => TagType::GameMechanic,
    _ => TagType::Genre, // default
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
pub fn match_entity_type(s: &str) -> EntityType {
  match s {
    "MEDIA" => EntityType::Media,
    "COLLECTION" => EntityType::Collection,
    "PERSON" => EntityType::Person,
    "COMPANY" => EntityType::Company,
    "SAGA" => EntityType::Saga,
    "GENRE" => EntityType::Genre,
    "GAME_MECHANIC" => EntityType::GameMechanic,
    _ => EntityType::Media,
  }
}
