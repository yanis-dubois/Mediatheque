use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum ImageSize {
  Small,
  Medium,
  Original,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[derive(strum::Display, strum::EnumString)]
#[strum(serialize_all = "SCREAMING_SNAKE_CASE")]
pub enum ImageType {
  Poster,
  Backdrop,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImageConfiguration {
  pub base_url: String,
  pub format: String,
  // { Type (Poster/Backdrop): { Size (Small/Medium/Original): Suffixe (w342/...) } }
  pub sizes: HashMap<ImageType, HashMap<ImageSize, String>>,
}
