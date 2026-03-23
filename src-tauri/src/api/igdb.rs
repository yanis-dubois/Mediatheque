use std::collections::HashMap;

use crate::{
  api::provider::MediaProvider,
  models::{
    api::{
      IgdbArtwork, IgdbGame, IgdbGameType, IgdbImage, IgdbInvolvedCompany, IgdbTag, IgdbTimeToBeat,
      MultiQueryResponse,
    },
    enums::{Language, MediaSource, MediaType, TagType},
    image::{ImageConfiguration, ImageSize, ImageType},
    media::{
      ApiEntityRelation, ApiMedia, ApiMediaRelations, ApiSearchResult, ApiState, MediaBase,
      MediaData, MediaExtension,
    },
  },
};

// utils

// date convertion (timestamp -> YYYY-MM-DD)
fn from_timestamp_to_date(timestamp: Option<i64>) -> String {
  timestamp
    .map(|ts| {
      chrono::DateTime::from_timestamp(ts, 0)
        .unwrap()
        .format("%Y-%m-%d")
        .to_string()
    })
    .unwrap_or_default()
}

// check for artworks, take screenshot if none was found
fn choose_backgrop(
  artworks: Option<Vec<IgdbArtwork>>,
  screenshots: Option<Vec<IgdbImage>>,
) -> Option<String> {
  let target_ratio = 16.0 / 9.0;
  let mut best_artwork: Option<(String, f32)> = None;

  if let Some(arts) = artworks {
    for art in arts {
      let (t, w, h) = (art.artwork_type, art.width, art.height);

      // is artwork
      if [1, 2, 3].contains(&t) {
        let current_ratio = w as f32 / h as f32;
        let diff = (current_ratio - target_ratio).abs();

        // keep it if better fitting
        if best_artwork
          .as_ref()
          .map_or(true, |(_, best_diff)| diff < *best_diff)
        {
          best_artwork = Some((art.image_id.clone(), diff));
        }
      }
    }
  }

  // return best artwork, or first screenshot if none
  best_artwork.map(|(id, _)| id).or_else(|| {
    screenshots
      .as_ref()
      .and_then(|s| s.first())
      .map(|img| img.image_id.clone())
  })
}

fn get_title_extended_by_type(name: String, game_type: Option<IgdbGameType>) -> String {
  let mut title = name;
  if let Some(t) = game_type {
    if t.id != 0 {
      title += &format!(" ({})", &t.game_type);
    }
  };

  return title;
}

fn get_company_relation(company: &IgdbInvolvedCompany) -> ApiEntityRelation {
  let mut role = Vec::new();
  let mut order: u32 = 0;

  if company.publisher {
    role.push("PUBLISHER".to_string());
    order = 4;
  }
  if company.porting {
    role.push("PORTING".to_string());
    order = 3;
  }
  if company.supporting {
    role.push("SUPPORTING".to_string());
    order = 2;
  }
  if company.developer {
    role.push("DEVELOPER".to_string());
    order = 1;
  }

  ApiEntityRelation {
    order: Some(order),
    values: role,
  }
}

fn extract_tags_names(
  tags_map: &mut HashMap<TagType, Vec<String>>,
  tags: Option<Vec<IgdbTag>>,
  tag_type: TagType,
) {
  let extracted_tags: Vec<String> = tags
    .unwrap_or_default()
    .into_iter()
    .map(|t| t.name)
    .collect();
  if !extracted_tags.is_empty() {
    tags_map.insert(tag_type, extracted_tags);
  }
}

// provider

pub struct IgdbProvider {
  pub source: MediaSource,
  pub token: String,
  pub client_id: String,
  pub base_media_url: String,
  pub image_config: ImageConfiguration,
  pub page_size: u32,
}

impl IgdbProvider {
  pub fn new() -> Self {
    let client_id =
      std::env::var("IGDB_CLIENT_ID").unwrap_or("IGDB_CLIENT_ID not found".to_string());
    let token = std::env::var("IGDB_API_TOKEN").unwrap_or("IGDB_API_TOKEN not found".to_string());

    Self {
      source: MediaSource::Igdb,
      token,
      client_id,
      base_media_url: "https://api.igdb.com/v4".to_string(),
      image_config: Self::create_config(),
      page_size: 20,
    }
  }
}

#[async_trait::async_trait]
impl MediaProvider for IgdbProvider {
  fn create_config() -> ImageConfiguration {
    let mut sizes = HashMap::new();

    let mut poster_sizes = HashMap::new();
    poster_sizes.insert(ImageSize::Small, "t_cover_small".to_string());
    poster_sizes.insert(ImageSize::Medium, "t_cover_big".to_string());
    poster_sizes.insert(ImageSize::Original, "t_1080p".to_string());

    let mut backdrop_sizes = HashMap::new();
    backdrop_sizes.insert(ImageSize::Small, "t_screenshot_med".to_string());
    backdrop_sizes.insert(ImageSize::Medium, "t_screenshot_huge".to_string());
    backdrop_sizes.insert(ImageSize::Original, "t_1080p".to_string());

    sizes.insert(ImageType::Poster, poster_sizes);
    sizes.insert(ImageType::Backdrop, backdrop_sizes);

    ImageConfiguration {
      base_url: "https://images.igdb.com/igdb/image/upload".to_string(),
      format: "jpg".to_string(),
      sizes,
    }
  }

  fn get_image_config(&self) -> &ImageConfiguration {
    &self.image_config
  }

  async fn search(
    &self,
    query: &str,
    language: Language,
    page: u32,
  ) -> Result<Vec<ApiSearchResult>, String> {
    // build request
    let url = format!("{}/games", self.base_media_url);
    let body = format!(
      "search \"{}\"; 
      fields name, summary, first_release_date, cover.image_id, artworks.image_id, artworks.artwork_type, artworks.height, artworks.width, screenshots.image_id, game_type.type; 
      where game_type = (0, 8, 9);
      limit {}; offset {};",
      query, self.page_size, page*self.page_size
    );

    // get response
    let client = reqwest::Client::new();
    let response: Vec<IgdbGame> = client
      .post(&url)
      .header("Client-ID", &self.client_id)
      .header("Authorization", format!("Bearer {}", &self.token))
      .body(body)
      .send()
      .await
      .map_err(|e| e.to_string())?
      .json()
      .await
      .map_err(|e| e.to_string())?;

    // JSON -> ApiSearchResult
    let results = response
      .into_iter()
      .map(|game| {
        let release_date = from_timestamp_to_date(game.first_release_date);
        let backdrop_path = choose_backgrop(game.artworks, game.screenshots);
        let title = get_title_extended_by_type(game.name, game.game_type);

        ApiSearchResult {
          core: MediaBase {
            media_type: MediaType::VideoGame,
            source: self.source.clone(),
            title: title,
            release_date,
            description: game.summary.unwrap_or_default(),
          },
          state: ApiState {
            external_id: game.id,
            id: None,
            is_in_library: false,
            poster_path: game.cover.map(|c| c.image_id),
            backdrop_path,
          },
        }
      })
      .collect();

    Ok(results)
  }

  async fn get_by_id(&self, external_id: u32, _language: Language) -> Result<ApiMedia, String> {
    // build request
    let url = format!("{}/multiquery", self.base_media_url);
    let body = format!(
      r#"
      query games "game_details" {{
        fields *, franchises.name, game_modes.name, genres.name, game_modes.name, game_status.status, game_type.type, player_perspectives.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, involved_companies.porting, involved_companies.supporting, cover.image_id, artworks.image_id, artworks.artwork_type, artworks.height, artworks.width, screenshots.image_id, themes.name, collections.name; 
        where id = {};
      }};

      query game_time_to_beats "time_to_beat" {{
        fields *;
        where game_id = {};
      }};
      "#,
      external_id, external_id
    );

    // get raw response (game details + how long to beat)
    let client = reqwest::Client::new();
    let raw_responses: Vec<MultiQueryResponse> = client
      .post(&url)
      .header("Client-ID", &self.client_id)
      .header("Authorization", format!("Bearer {}", &self.token))
      .body(body)
      .send()
      .await
      .map_err(|e| e.to_string())?
      .json()
      .await
      .map_err(|e| e.to_string())?;

    // get game info (fail if not founded)
    let game: IgdbGame = raw_responses
      .iter()
      .find(|r| r.name == "game_details")
      .and_then(|r| r.result.get(0))
      .and_then(|v| serde_json::from_value(v.clone()).ok())
      .ok_or_else(|| {
        "Impossible de trouver les détails du jeu (ID invalide ou erreur API)".to_string()
      })?;

    // get time_to_beat info (set default if not founded)
    let playing_time: IgdbTimeToBeat = raw_responses
      .iter()
      .find(|r| r.name == "time_to_beat")
      .and_then(|r| r.result.get(0))
      .and_then(|v| serde_json::from_value(v.clone()).ok())
      .unwrap_or_else(|| IgdbTimeToBeat {
        normally: None,
        completely: None,
      });

    let mut companies: HashMap<String, ApiEntityRelation> = HashMap::new();
    let mut tags: HashMap<TagType, Vec<String>> = HashMap::new();

    // extract companies
    if let Some(involved_companies) = game.involved_companies {
      for company in involved_companies.iter() {
        companies
          .entry(company.company.name.clone())
          .or_insert(get_company_relation(company));
      }
    }

    // -- tag
    // release status, default is 'released'
    let status = game
      .game_status
      .map(|s| s.status)
      .unwrap_or_else(|| "Released".to_string());
    tags.insert(TagType::ReleaseStatus, vec![status]);
    // other tags
    let tags_to_process = [
      (game.themes, TagType::Genre),
      (game.genres, TagType::GameMechanic),
      (game.game_modes, TagType::GameMode),
      (game.player_perspectives, TagType::CameraPerspective),
      (game.collections, TagType::Saga),
      (game.franchises, TagType::Franchise),
    ];
    for (data, tag_type) in tags_to_process {
      extract_tags_names(&mut tags, data, tag_type);
    }

    let release_date = from_timestamp_to_date(game.first_release_date);
    let backdrop_path = choose_backgrop(game.artworks, game.screenshots);
    let title = get_title_extended_by_type(game.name, game.game_type);

    let base = MediaBase {
      media_type: MediaType::VideoGame,
      source: self.source.clone(),
      title: title,
      release_date,
      description: game.summary.unwrap_or_default(),
    };

    // add detailed infos
    let extension = {
      MediaExtension::VideoGame {
        synopsis: game.storyline,
        normal_playing_time: playing_time.normally,
        complete_playing_time: playing_time.completely,
      }
    };

    Ok(ApiMedia {
      data: MediaData { base, extension },
      state: ApiState {
        external_id,
        id: None,
        is_in_library: false,
        poster_path: game.cover.map(|c| c.image_id),
        backdrop_path: backdrop_path,
      },
      relations: ApiMediaRelations {
        persons: HashMap::new(),
        cast: HashMap::new(),
        companies,
        tags,
      },
    })
  }
}
