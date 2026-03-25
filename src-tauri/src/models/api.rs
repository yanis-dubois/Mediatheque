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
  pub company: IgdbCompany,
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
  pub author_names: Vec<String>,
  pub contribution_types: Vec<String>,
  // pub genres: Vec<String>,
  pub description: Option<String>,
  pub image: Option<HardcoverImage>,
  pub release_date: Option<String>,
}

#[derive(Deserialize)]
pub struct HardcoverImage {
  pub url: Option<String>,
  pub height: Option<u32>,
  pub width: Option<u32>,
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
