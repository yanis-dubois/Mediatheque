use serde::Deserialize;

#[derive(Deserialize)]
pub struct ApiResponse {
  pub results: Vec<serde_json::Value>,
}

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
