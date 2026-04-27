use std::collections::HashMap;

use crate::{
  api::provider::MediaProvider,
  models::{
    api::{ApiSearchResultCount, BggSearchResponse, BggThingResponse},
    enums::{Language, MediaSource, MediaType, TagType},
    image::{ImageConfiguration, ImageSize, ImageType},
    media::{
      ApiEntityRelation, ApiMedia, ApiMediaRelations, ApiSearchResult, ApiState, MediaBase,
      MediaData, MediaExtension,
    },
  },
};

// provider

struct SearchCache {
  query: String,
  ids: Vec<u32>,
}

pub struct BggProvider {
  pub source: MediaSource,
  pub token: String,
  pub base_media_url: String,
  pub image_config: ImageConfiguration,
  pub page_size: u32,
  cache: std::sync::Mutex<Option<SearchCache>>,
}

impl BggProvider {
  pub fn new() -> Self {
    let token = option_env!("BGG_API_TOKEN")
      .unwrap_or("NOT_FOUND")
      .to_string();

    if token == "NOT_FOUND" {
      eprintln!("CRITICAL: BGG_API_TOKEN not found");
    }

    Self {
      source: MediaSource::Bgg,
      token,
      base_media_url: "https://boardgamegeek.com/xmlapi2".to_string(),
      image_config: Self::create_config(),
      page_size: 20,
      cache: std::sync::Mutex::new(None),
    }
  }
}

#[async_trait::async_trait]
impl MediaProvider for BggProvider {
  fn create_config() -> ImageConfiguration {
    ImageConfiguration {
      base_url: "https://cf.geekdo-images.com".to_string(),
      format: "jpg".to_string(),
      sizes: HashMap::new(),
    }
  }

  fn supports_native_lods(&self) -> bool {
    false
  }

  fn get_image_config(&self) -> &ImageConfiguration {
    &self.image_config
  }

  fn get_image_url(&self, path: &str, _image_type: ImageType, _size: ImageSize) -> String {
    format!("{}", path)
  }

  async fn search(
    &self,
    query: &str,
    _language: Language,
    page: u32,
  ) -> Result<ApiSearchResultCount, String> {
    let client = reqwest::Client::new();
    let mut count = -1;

    // verify if we need to update ids cache
    let needs_search = {
      let cache_lock = self.cache.lock().unwrap();
      cache_lock.is_none() || cache_lock.as_ref().unwrap().query != query
    };

    // get ids
    if needs_search {
      println!("search : load ids cache");
      let search_url = format!(
        "{}/search?query={}&type=boardgame,boardgameexpansion",
        self.base_media_url,
        urlencoding::encode(query)
      );

      let xml_search = client
        .get(search_url)
        .header("Authorization", format!("Bearer {}", self.token))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

      let search_data: BggSearchResponse =
        quick_xml::de::from_str(&xml_search).map_err(|e| format!("BGG Search XML Error: {}", e))?;

      let new_ids: Vec<u32> = search_data.items.iter().map(|i| i.id).collect();

      let mut cache_lock = self.cache.lock().unwrap();
      *cache_lock = Some(SearchCache {
        query: query.to_string(),
        ids: new_ids,
      });

      count = search_data.total;
    }

    // load ids from cache that correspond to current page
    let cached_ids = {
      let cache_lock = self.cache.lock().unwrap();
      let cache = cache_lock.as_ref().unwrap();
      let start = ((page - 1) * self.page_size) as usize;
      let end = std::cmp::min(start + (self.page_size as usize), cache.ids.len());

      if start >= cache.ids.len() {
        return Ok(ApiSearchResultCount {
          results: Vec::new(),
          count: -1,
        });
      }
      cache.ids[start..end].to_vec()
    };
    let ids_str = cached_ids
      .iter()
      .map(|id| id.to_string())
      .collect::<Vec<_>>()
      .join(",");

    // get infos
    println!("search : load data");
    let thing_url = format!("{}/thing?id={}", self.base_media_url, ids_str);
    let xml_thing_content = client
      .get(thing_url)
      .header("Authorization", format!("Bearer {}", self.token))
      .send()
      .await
      .map_err(|e| e.to_string())?
      .text()
      .await
      .map_err(|e| e.to_string())?;

    // XML -> struct
    let full_data: BggThingResponse = quick_xml::de::from_str(&xml_thing_content)
      .map_err(|e| format!("Error while parsing BGG XML: {}", e))?;

    // keep only wanted fields
    let results: Vec<ApiSearchResult> = full_data
      .items
      .into_iter()
      .map(|item| {
        let title = item
          .names
          .iter()
          .find(|n| n.name_type == "primary")
          .map(|n| n.value.clone())
          .unwrap_or_else(|| "Unknown Title".to_string());

        let creators = item
          .links
          .iter()
          .filter(|l| l.link_type == "boardgamedesigner")
          .map(|l| l.value.clone())
          .collect::<Vec<String>>();

        ApiSearchResult {
          core: MediaBase {
            media_type: MediaType::TabletopGame,
            source: self.source.clone(),
            title,
            release_date: item.yearpublished.map(|y| y.value).unwrap_or_default(),
            description: "".to_string(),
            creators,
          },
          state: ApiState {
            external_id: item.id,
            id: None,
            is_in_library: false,
            poster_path: item.thumbnail,
            backdrop_path: None,
          },
        }
      })
      .collect();

    Ok(ApiSearchResultCount {
      results,
      count: count,
    })
  }

  async fn get_by_id(&self, external_id: u32, _language: Language) -> Result<ApiMedia, String> {
    let url = format!("{}/thing?id={}", self.base_media_url, external_id);

    let client = reqwest::Client::new();
    let xml_content = client
      .get(url)
      .header("Authorization", format!("Bearer {}", self.token))
      .send()
      .await
      .map_err(|e| e.to_string())?
      .text()
      .await
      .map_err(|e| e.to_string())?;

    let response: BggSearchResponse =
      quick_xml::de::from_str(&xml_content).map_err(|e| format!("BGG Detail XML Error: {}", e))?;
    let item = response
      .items
      .into_iter()
      .next()
      .ok_or_else(|| "Game not found".to_string())?;

    let mut creators: Vec<String> = Vec::new();
    let mut persons: HashMap<String, ApiEntityRelation> = HashMap::new();
    let mut companies: HashMap<String, ApiEntityRelation> = HashMap::new();
    let mut tags: HashMap<TagType, Vec<String>> = HashMap::new();

    // retrieve relations
    for (index, link) in item.links.iter().enumerate() {
      match link.link_type.as_str() {
        "boardgamedesigner" => {
          creators.push(link.value.clone());
          persons.insert(
            link.value.clone(),
            ApiEntityRelation {
              order: Some(index as u32),
              values: vec!["DESIGNER".to_string()],
            },
          );
        }
        "boardgameartist" => {
          persons
            .entry(link.value.clone())
            .or_insert(ApiEntityRelation {
              order: Some(index as u32),
              values: Vec::new(),
            })
            .values
            .push("ARTIST".to_string());
        }
        "boardgamepublisher" => {
          companies.insert(
            link.value.clone(),
            ApiEntityRelation {
              order: Some(index as u32),
              values: vec!["PUBLISHER".to_string()],
            },
          );
        }
        "boardgamecategory" => {
          tags
            .entry(TagType::Genre)
            .or_default()
            .push(link.value.clone());
        }
        "boardgamemechanic" => {
          tags
            .entry(TagType::GameMechanic)
            .or_default()
            .push(link.value.clone());
        }
        _ => {}
      }
    }

    let title = item
      .names
      .iter()
      .find(|n| n.name_type == "primary")
      .map(|n| n.value.clone())
      .unwrap_or_else(|| "Untitled".to_string());

    let base = MediaBase {
      media_type: MediaType::TabletopGame,
      source: self.source.clone(),
      title,
      release_date: item.yearpublished.map(|y| y.value).unwrap_or_default(),
      description: item.description.unwrap_or_default(),
      creators,
    };

    // add detailed infos
    let extension = MediaExtension::TabletopGame {
      min_players: item.minplayers.and_then(|f| Some(f.value)),
      max_players: item.maxplayers.and_then(|f| Some(f.value)),
      min_playing_time: item.minplaytime.and_then(|f| Some(f.value)),
      max_playing_time: item.maxplaytime.and_then(|f| Some(f.value)),
    };

    Ok(ApiMedia {
      data: MediaData { base, extension },
      state: ApiState {
        external_id,
        id: None,
        is_in_library: false,
        poster_path: item.image,
        backdrop_path: None,
      },
      relations: ApiMediaRelations {
        persons,
        cast: HashMap::new(),
        companies,
        tags,
      },
    })
  }
}
