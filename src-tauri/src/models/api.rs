use std::collections::HashMap;

use serde::Deserialize;

#[derive(Deserialize)]
pub struct ApiResponse {
  pub results: Vec<serde_json::Value>,
}

/* IGDB */

#[derive(Deserialize)]
pub struct MultiQueryResponse {
  pub name: String,
  pub result: serde_json::Value,
}

#[derive(Deserialize)]
pub struct IgdbGame {
  pub id: u32,
  pub name: String,
  pub game_type: Option<IgdbGameType>,

  pub first_release_date: Option<i64>,
  pub game_status: Option<IgdbStatus>,

  pub summary: Option<String>,
  pub storyline: Option<String>,

  pub cover: Option<IgdbImage>,
  pub artworks: Option<Vec<IgdbArtwork>>,
  pub screenshots: Option<Vec<IgdbImage>>,

  pub franchises: Option<Vec<IgdbTag>>,
  pub genres: Option<Vec<IgdbTag>>,
  pub game_modes: Option<Vec<IgdbTag>>,
  pub player_perspectives: Option<Vec<IgdbTag>>,
  pub themes: Option<Vec<IgdbTag>>,
  pub collections: Option<Vec<IgdbTag>>,

  pub involved_companies: Option<Vec<IgdbInvolvedCompany>>,
}

#[derive(Deserialize)]
pub struct IgdbImage {
  pub image_id: String,
}

#[derive(Deserialize)]
pub struct IgdbArtwork {
  pub image_id: String,
  pub artwork_type: u32,
  pub height: u32,
  pub width: u32,
}

#[derive(Deserialize)]
pub struct IgdbGameType {
  #[serde(rename = "type")]
  pub game_type: String,
  pub id: u32,
}

#[derive(Deserialize)]
pub struct IgdbStatus {
  pub status: String,
}

#[derive(Deserialize)]
pub struct IgdbTag {
  pub name: String,
}

#[derive(Deserialize)]
pub struct IgdbCompany {
  pub name: String,
}

#[derive(Deserialize)]
pub struct IgdbInvolvedCompany {
  pub developer: bool,
  pub porting: bool,
  pub publisher: bool,
  pub supporting: bool,
  pub company: Option<IgdbCompany>,
}

#[derive(Deserialize)]
pub struct IgdbTimeToBeat {
  pub normally: Option<u32>,
  pub completely: Option<u32>,
}

/* Hardcover */

// search response

#[derive(Deserialize)]
pub struct HardcoverResponse {
  pub data: HardcoverData,
}

#[derive(Deserialize)]
pub struct HardcoverData {
  pub search: HardcoverSearch,
}

#[derive(Deserialize)]
pub struct HardcoverSearch {
  pub results: HardcoverResults,
}

#[derive(Deserialize)]
pub struct HardcoverResults {
  pub hits: Vec<HardcoverDocument>,
}

#[derive(Deserialize)]
pub struct HardcoverDocument {
  pub document: HardcoverBookRaw,
}

#[derive(Deserialize)]
pub struct HardcoverBookRaw {
  pub id: String,
  pub title: String,
  pub contributions: Vec<HardcoverContributions>,
  pub description: Option<String>,
  pub image: Option<HardcoverImage>,
  pub release_date: Option<String>,
}

#[derive(Deserialize)]
pub struct HardcoverImage {
  pub url: Option<String>,
}

// by id response

#[derive(Deserialize)]
pub struct HardcoverByIdResponse {
  pub data: HardcoverBook,
}

#[derive(Deserialize)]
pub struct HardcoverBook {
  pub books: Vec<HardcoverBookInfos>,
}

#[derive(Deserialize)]
pub struct HardcoverBookInfos {
  pub title: String,
  pub contributions: Vec<HardcoverContributions>,
  pub book_category_id: u32,
  pub book_series: Vec<HardcoverSeries>,
  pub cached_tags: HashMap<String, Vec<HardcoverTag>>,
  pub description: Option<String>,
  pub image: Option<HardcoverImage>,
  pub release_date: Option<String>,
  pub pages: Option<u32>,
}

#[derive(Deserialize)]
pub struct HardcoverContributions {
  pub author: HardcoverAuthor,
  pub contribution: Option<String>, // role
}

#[derive(Deserialize)]
pub struct HardcoverAuthor {
  pub name: String, // role
}

#[derive(Deserialize)]
pub struct HardcoverSeries {
  pub series: HardcoverSerie,
}

#[derive(Deserialize)]
pub struct HardcoverSerie {
  pub name: String,
}

#[derive(Deserialize)]
pub struct HardcoverTag {
  pub tag: String,
}

/* BGG */

#[derive(Debug, Deserialize)]
pub struct BggSearchResponse {
  #[serde(rename = "item", default)]
  pub items: Vec<BggSearchItem>,
}

#[derive(Debug, Deserialize)]
pub struct BggSearchItem {
  #[serde(rename = "@id")]
  pub id: u32,
  #[serde(rename = "name", default)]
  pub names: Vec<BggName>,
  pub yearpublished: Option<BggValue>,
  pub minplayers: Option<BggNumericValue>,
  pub maxplayers: Option<BggNumericValue>,
  pub minplaytime: Option<BggNumericValue>,
  pub maxplaytime: Option<BggNumericValue>,
  pub thumbnail: Option<String>,
  pub image: Option<String>,
  pub description: Option<String>,
  #[serde(rename = "link", default)]
  pub links: Vec<BggLink>,
}

#[derive(Debug, Deserialize)]
pub struct BggValue {
  #[serde(rename = "@value")]
  pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct BggNumericValue {
  #[serde(rename = "@value")]
  pub value: u32,
}

#[derive(Debug, Deserialize)]
pub struct BggName {
  #[serde(rename = "@type")]
  pub name_type: String,
  #[serde(rename = "@value")]
  pub value: String,
}

#[derive(Debug, Deserialize)]
pub struct BggLink {
  #[serde(rename = "@type")]
  pub link_type: String,
  #[serde(rename = "@value")]
  pub value: String,
}
