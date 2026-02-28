use crate::models::enums::MediaType;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalMedia {
    #[serde(skip_deserializing)]
    pub media_type: MediaType,
    pub title: String,
    pub image_url: String,
    pub description: String,
    pub release_date: String,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "mediaType", rename_all = "camelCase")] // Serde va regarder ce champ pour savoir quoi désérialiser
pub enum ExternalMediaRequest {
    #[serde(rename = "MOVIE")]
    Movie(ExternalMovie),
    #[serde(rename = "SERIES")]
    Series(ExternalSeries),
    #[serde(rename = "TABLETOP_GAME")]
    TabletopGame(ExternalTabletopGame),
}

impl ExternalMediaRequest {
    pub fn base(&self) -> &ExternalMedia {
        match self {
            ExternalMediaRequest::Movie(m) => &m.base,
            ExternalMediaRequest::Series(s) => &s.base,
            ExternalMediaRequest::TabletopGame(g) => &g.base,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalMovie {
    // media common fields
    #[serde(flatten)]
    pub base: ExternalMedia,

    // movie specific fields
    pub directors: Vec<String>,
    pub genre: Vec<String>,
    pub serie: Option<String>,
    pub duration: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSeries {
    // media common fields
    #[serde(flatten)]
    pub base: ExternalMedia,

    // series specific fields
    pub creators: Vec<String>,
    pub genre: Vec<String>,
    pub seasons: i32,
    pub episodes: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalTabletopGame {
    // media common fields
    #[serde(flatten)]
    pub base: ExternalMedia,

    // series specific fields
    pub designers: Vec<String>,
    pub artists: Vec<String>,
    pub publishers: Vec<String>,
    pub game_mechanics: Vec<String>,
    pub player_count: String,
    pub playing_time: String,
}
