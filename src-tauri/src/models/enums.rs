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
  MediaOwnership,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(untagged)]
#[derive(strum::Display)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum SettingValue {
  Language(Language),
  ScoreMode(ScoreDisplayMode),
  Theme(Theme),
  MediaOwnership(MediaOwnershipMode),
}

impl SettingValue {
  pub fn to_db_string(&self) -> String {
    match self {
      SettingValue::Language(mode) => mode.to_string(),
      SettingValue::ScoreMode(mode) => mode.to_string(),
      SettingValue::Theme(mode) => mode.to_string(),
      SettingValue::MediaOwnership(mode) => mode.to_string(),
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

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum MediaOwnershipMode {
  Hidden,
  Shown,
}

/* Media */

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter, Hash, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum MediaSource {
  Manual,
  Tmdb,
  Igdb,
  Hardcover,
  Bgg,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, EnumIter, Hash, Eq)]
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
pub enum MediaPossessionStatus {
  #[default]
  Wanted,
  Borrowed,
  Owned,
  NotOwned,
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
  ReleaseStatus,
  Franchise,
  GameMode,
  CameraPerspective,
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
  Detailed,
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
pub fn match_media_source(s: &str) -> MediaSource {
  match s {
    "MANUAL" => MediaSource::Manual,
    "TMDB" => MediaSource::Tmdb,
    "IGDB" => MediaSource::Igdb,
    "HARDCOVER" => MediaSource::Hardcover,
    "BGG" => MediaSource::Bgg,
    _ => todo!(),
  }
}
pub fn match_media_type(s: &str) -> MediaType {
  match s {
    "BOOK" => MediaType::Book,
    "MOVIE" => MediaType::Movie,
    "SERIES" => MediaType::Series,
    "VIDEO_GAME" => MediaType::VideoGame,
    "TABLETOP_GAME" => MediaType::TabletopGame,
    _ => todo!(),
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
pub fn match_media_possession_status(s: &str) -> MediaPossessionStatus {
  match s {
    "OWNED" => MediaPossessionStatus::Owned,
    "BORROWED" => MediaPossessionStatus::Borrowed,
    "WANTED" => MediaPossessionStatus::Wanted,
    _ => MediaPossessionStatus::NotOwned, // default
  }
}
pub fn match_tag_type(s: &str) -> TagType {
  match s {
    "GENRE" => TagType::Genre,
    "SAGA" => TagType::Saga,
    "GAME_MECHANIC" => TagType::GameMechanic,
    "RELEASE_STATUS" => TagType::ReleaseStatus,
    "FRANCHISE" => TagType::Franchise,
    "GAME_MODE" => TagType::GameMode,
    "CAMERA_PERSPECTIVE" => TagType::CameraPerspective,
    _ => todo!(), // default
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
    "DETAILED" => CollectionLayout::Detailed,
    _ => todo!(), // default
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

pub fn from_metadata_type_to_entity_type(metadata_type: MetadataType) -> EntityType {
  match metadata_type {
    MetadataType::Person => EntityType::Person,
    MetadataType::Company => EntityType::Company,
    MetadataType::Saga => EntityType::Saga,
    MetadataType::Genre => EntityType::Genre,
    MetadataType::GameMechanic => EntityType::GameMechanic,
  }
}
