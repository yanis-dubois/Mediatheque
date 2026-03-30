use std::collections::HashMap;

use crate::{
  api::provider::MediaProvider,
  models::{
    api::ApiResponse,
    enums::{Language, MediaSource, MediaType, TagType},
    image::{ImageConfiguration, ImageSize, ImageType},
    media::{
      ApiEntityRelation, ApiMedia, ApiMediaRelations, ApiSearchResult, ApiState, MediaBase,
      MediaData, MediaExtension,
    },
  },
};

// utils

fn get_endpoint_from_media_type(media_type: MediaType) -> String {
  if media_type == MediaType::Series {
    "tv".to_string()
  } else {
    "movie".to_string()
  }
}

fn format_language(language: Language) -> String {
  let language_str = language.to_string();
  format!(
    "{}-{}",
    language_str.to_lowercase(),
    language_str.to_uppercase()
  )
}

fn get_job_priority(job: &str) -> i32 {
  match job {
    "Director" | "Creator" => 1,
    "Screenplay" | "Writer" | "Author" | "Novel" => 2,
    "Story" | "Characters" => 3,
    _ => 100,
  }
}

fn clean_image_path(path: &str) -> String {
  let path = path.trim_start_matches('/');

  if let Some(dot_index) = path.rfind('.') {
    path[..dot_index].to_string()
  } else {
    path.to_string()
  }
}

// provider

pub struct TmdbProvider {
  pub source: MediaSource,
  pub token: String,
  pub base_media_url: String,
  pub image_config: ImageConfiguration,
  pub media_type: MediaType,
}

impl TmdbProvider {
  pub fn new(media_type: MediaType) -> Self {
    let token = option_env!("TMDB_API_TOKEN")
      .unwrap_or("NOT_FOUND")
      .to_string();

    if token == "NOT_FOUND" {
      eprintln!("CRITICAL: TMDB_API_TOKEN not found");
    }

    Self {
      source: MediaSource::Tmdb,
      token,
      base_media_url: "https://api.themoviedb.org/3".to_string(),
      image_config: Self::create_config(),
      media_type,
    }
  }
}

#[async_trait::async_trait]
impl MediaProvider for TmdbProvider {
  fn create_config() -> ImageConfiguration {
    let mut sizes = HashMap::new();

    let mut poster_sizes = HashMap::new();
    poster_sizes.insert(ImageSize::Small, "w92".to_string());
    poster_sizes.insert(ImageSize::Medium, "w342".to_string());
    poster_sizes.insert(ImageSize::Original, "original".to_string());

    let mut backdrop_sizes = HashMap::new();
    backdrop_sizes.insert(ImageSize::Small, "w300".to_string());
    backdrop_sizes.insert(ImageSize::Medium, "w1280".to_string());
    backdrop_sizes.insert(ImageSize::Original, "original".to_string());

    sizes.insert(ImageType::Poster, poster_sizes);
    sizes.insert(ImageType::Backdrop, backdrop_sizes);

    ImageConfiguration {
      base_url: "https://image.tmdb.org/t/p".to_string(),
      format: "jpg".to_string(),
      sizes,
    }
  }

  fn supports_native_lods(&self) -> bool {
    true
  }

  fn get_image_config(&self) -> &ImageConfiguration {
    &self.image_config
  }

  fn get_image_url(&self, path: &str, image_type: ImageType, size: ImageSize) -> String {
    let config = self.get_image_config();

    let size_str = config
      .sizes
      .get(&image_type)
      .and_then(|type_sizes| type_sizes.get(&size))
      .map(|s| s.as_str())
      .unwrap_or("original");

    let clean_path = path.trim_start_matches('/');

    format!(
      "{}/{}/{}.{}",
      config.base_url, size_str, clean_path, config.format
    )
  }

  async fn search(
    &self,
    query: &str,
    language: Language,
    page: u32,
  ) -> Result<Vec<ApiSearchResult>, String> {
    // build url
    let endpoint = get_endpoint_from_media_type(self.media_type.clone());
    let formatted_language = format_language(language);
    let url = format!(
      "{}/search/{}?query={}&language={}&page={}",
      self.base_media_url,
      endpoint,
      urlencoding::encode(query),
      formatted_language,
      page
    );

    // get row data
    let client = reqwest::Client::new();

    let response = client
      .get(url)
      .header("Authorization", format!("Bearer {}", self.token))
      .header("accept", "application/json")
      .send()
      .await
      .map_err(|e| format!("Network Error: {}", e))?;

    // 1. Vérifier le status code (Indispensable !)
    let status = response.status();
    if !status.is_success() {
      let err_text = response.text().await.unwrap_or_default();
      let err_msg = format!("API Error {}: {}", status, err_text);
      eprintln!("{}", err_msg);
      return Err(err_msg);
    }

    // 2. Si c'est un succès, lire le JSON
    let full_data: ApiResponse = response.json().await.map_err(|e| {
      let err_msg = format!("JSON DESERIALIZATION ERROR: {:?}", e);
      eprintln!("{}", err_msg);
      err_msg
    })?;

    // keep only wanted fields
    let results: Vec<ApiSearchResult> = full_data
      .results
      .into_iter()
      .filter_map(|item| {
        Some(ApiSearchResult {
          core: MediaBase {
            media_type: self.media_type.clone(),
            source: self.source.clone(),
            title: item["title"]
              .as_str()
              .or(item["name"].as_str())
              .unwrap_or("Untitled")
              .to_string(),
            release_date: item["release_date"]
              .as_str()
              .or(item["first_air_date"].as_str())
              .unwrap_or("")
              .to_string(),
            description: item["overview"].as_str().unwrap_or("").to_string(),
            creators: Vec::new(),
          },
          state: ApiState {
            external_id: item["id"].as_u64()? as u32,
            id: None,
            is_in_library: false,
            poster_path: item["poster_path"].as_str().map(|s| clean_image_path(s)),
            backdrop_path: item["backdrop_path"].as_str().map(|s| clean_image_path(s)),
          },
        })
      })
      .collect();

    Ok(results)
  }

  async fn get_by_id(&self, external_id: u32, language: Language) -> Result<ApiMedia, String> {
    // build url
    let endpoint = get_endpoint_from_media_type(self.media_type.clone());
    let formatted_language = format_language(language);
    let url = format!(
      "{}/{}/{}?append_to_response=credits&language={}",
      self.base_media_url, endpoint, external_id, formatted_language
    );

    let client = reqwest::Client::new();
    let data: serde_json::Value = client
      .get(url)
      .header("Authorization", format!("Bearer {}", self.token))
      .send()
      .await
      .map_err(|e| e.to_string())?
      .json()
      .await
      .map_err(|e| e.to_string())?;

    let mut creators: Vec<String> = Vec::new();
    let mut persons: HashMap<String, ApiEntityRelation> = HashMap::new();
    let mut cast: HashMap<String, ApiEntityRelation> = HashMap::new();
    let mut companies: HashMap<String, ApiEntityRelation> = HashMap::new();
    let mut tags: HashMap<TagType, Vec<String>> = HashMap::new();

    // extract creators
    // -- for movie
    if self.media_type == MediaType::Movie {
      let mut featured_crew: Vec<(String, String)> = Vec::new();
      if let Some(crew) = data["credits"]["crew"].as_array() {
        for member in crew {
          if let (Some(name), Some(job)) = (member["name"].as_str(), member["job"].as_str()) {
            let priority = get_job_priority(job);
            if priority < 100 {
              featured_crew.push((name.to_string(), job.to_string()));
            }
          }
        }
      }

      featured_crew.sort_by_key(|item| get_job_priority(&item.1));

      for (index, (name, job)) in featured_crew.into_iter().take(6).enumerate() {
        let entry = persons.entry(name.clone()).or_insert(ApiEntityRelation {
          order: Some(index as u32),
          values: Vec::new(),
        });
        entry.values.push(job.to_uppercase());
        if job.to_uppercase() == "DIRECTOR" {
          creators.push(name);
        }
      }
    }
    // -- for series
    else {
      if let Some(creators_data) = data["created_by"].as_array() {
        for (index, creator) in creators_data.iter().enumerate() {
          if let Some(name) = creator["name"].as_str() {
            persons
              .entry(name.to_string())
              .or_insert(ApiEntityRelation {
                order: Some(index as u32),
                values: vec!["CREATOR".to_string()],
              });
            creators.push(name.to_string());
          }
        }
      }
    }

    // extract cast (only the 10 first actors)
    if let Some(c) = data["credits"]["cast"].as_array() {
      for (index, member) in c.iter().take(10).enumerate() {
        if let (Some(name), Some(role)) = (member["name"].as_str(), member["character"].as_str()) {
          let entry = cast.entry(name.to_string()).or_insert(ApiEntityRelation {
            order: Some(index as u32),
            values: Vec::new(),
          });
          entry.values.push(role.to_string());
        }
      }
    }

    // extract companies
    if let Some(production_companies) = data["production_companies"].as_array() {
      for (index, comp) in production_companies.iter().enumerate() {
        if let Some(name) = comp["name"].as_str() {
          companies
            .entry(name.to_string())
            .or_insert(ApiEntityRelation {
              order: Some(index as u32),
              values: vec!["PRODUCTION".to_string()],
            });
        }
      }
    }

    // tag
    // genre
    let genres: Vec<String> = data["genres"]
      .as_array()
      .unwrap_or(&vec![])
      .iter()
      .filter_map(|g| g["name"].as_str().map(|s| s.to_string()))
      .flat_map(|s| {
        s.split(['&', '/'])
          .map(|part| part.trim().to_string())
          .filter(|part| !part.is_empty())
          .collect::<Vec<_>>()
      })
      .collect();
    if !genres.is_empty() {
      tags.insert(TagType::Genre, genres);
    }
    // saga (for movies)
    if let Some(collection) = data["belongs_to_collection"].as_object() {
      let raw_name = collection["name"].as_str().unwrap_or("");
      let saga_name = raw_name
        .replace(" Collection", "")
        .replace(" collection", "")
        .trim()
        .to_string();
      tags.insert(TagType::Saga, vec![saga_name]);
    }

    let base = MediaBase {
      media_type: self.media_type.clone(),
      source: self.source.clone(),
      title: data["title"]
        .as_str()
        .or(data["name"].as_str())
        .unwrap_or("Untitled")
        .to_string(),
      release_date: data["release_date"]
        .as_str()
        .or(data["first_air_date"].as_str())
        .unwrap_or("")
        .to_string(),
      description: data["overview"].as_str().unwrap_or("").to_string(),
      creators,
    };

    // add detailed infos
    let extension = match self.media_type {
      MediaType::Movie => MediaExtension::Movie {
        duration: data["runtime"].as_i64().unwrap_or(0) as i32,
      },
      MediaType::Series => MediaExtension::Series {
        seasons: data["number_of_seasons"].as_i64().unwrap_or(0) as i32,
        episodes: data["number_of_episodes"].as_i64().unwrap_or(0) as i32,
      },
      _ => MediaExtension::None,
    };

    Ok(ApiMedia {
      data: MediaData { base, extension },
      state: ApiState {
        external_id,
        id: None,
        is_in_library: false,
        poster_path: data["poster_path"].as_str().map(|s| clean_image_path(s)),
        backdrop_path: data["backdrop_path"].as_str().map(|s| clean_image_path(s)),
      },
      relations: ApiMediaRelations {
        persons,
        cast,
        companies,
        tags,
      },
    })
  }
}
