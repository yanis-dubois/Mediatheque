use std::collections::HashMap;

use crate::{
  api::provider::MediaProvider,
  models::{
    api::ApiResponse,
    enums::{Language, MediaType, TagType},
    image::{ImageSize, ImageType},
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

// provider

pub struct TmdbProvider {
  pub token: String,
  pub base_media_url: String,
  pub base_image_url: String,
  pub image_format: String,
  pub media_type: MediaType,
}

impl TmdbProvider {
  pub fn new(media_type: MediaType) -> Self {
    let token = std::env::var("TMDB_API_TOKEN").unwrap_or("TMDB_API_TOKEN not found".to_string());

    Self {
      token,
      base_media_url: "https://api.themoviedb.org/3".to_string(),
      base_image_url: "https://image.tmdb.org/t/p".to_string(),
      image_format: "jpg".to_string(),
      media_type,
    }
  }
}

#[async_trait::async_trait]
impl MediaProvider for TmdbProvider {
  fn get_image_url(&self, path: &str, image_type: ImageType, size: ImageSize) -> String {
    let size_str = match image_type {
      ImageType::Poster => match size {
        ImageSize::Small => "w92",
        ImageSize::Medium => "w342",
        ImageSize::Original => "original",
      },
      ImageType::Backdrop => match size {
        ImageSize::Small => "w300",
        ImageSize::Medium => "w1280",
        ImageSize::Original => "original",
      },
    };

    let clean_path = path.trim_start_matches('/');
    format!(
      "{}/{}/{}.{}",
      self.base_image_url, size_str, clean_path, self.image_format
    )
  }

  fn get_image_format(&self) -> &str {
    &self.image_format
  }

  async fn search(&self, query: &str, language: Language) -> Result<Vec<ApiSearchResult>, String> {
    // build url
    let endpoint = get_endpoint_from_media_type(self.media_type.clone());
    let formatted_language = format_language(language);
    let url = format!(
      "{}/search/{}?query={}&language={}",
      self.base_media_url,
      endpoint,
      urlencoding::encode(query),
      formatted_language
    );

    // get row data
    let client = reqwest::Client::new();
    let full_data: ApiResponse = client
      .get(url)
      .header("Authorization", format!("Bearer {}", self.token))
      .header("accept", "application/json")
      .send()
      .await
      .map_err(|e| e.to_string())?
      .json()
      .await
      .map_err(|e| e.to_string())?;

    // keep only wanted fields
    let results: Vec<ApiSearchResult> = full_data
      .results
      .into_iter()
      .filter_map(|item| {
        Some(ApiSearchResult {
          core: MediaBase {
            media_type: self.media_type.clone(),
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
          },
          state: ApiState {
            external_id: item["id"].as_u64()? as u32,
            id: None,
            is_in_library: false,
            poster_path: item["poster_path"].as_str().map(|s| s.to_string()),
            backdrop_path: item["backdrop_path"].as_str().map(|s| s.to_string()),
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
        let entry = persons.entry(name).or_insert(ApiEntityRelation {
          order: Some(index as u32),
          values: Vec::new(),
        });
        entry.values.push(job.to_uppercase());
      }
    }
    // -- for series
    else {
      if let Some(creators) = data["created_by"].as_array() {
        for (index, creator) in creators.iter().enumerate() {
          if let Some(name) = creator["name"].as_str() {
            persons
              .entry(name.to_string())
              .or_insert(ApiEntityRelation {
                order: Some(index as u32),
                values: vec!["CREATOR".to_string()],
              });
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
        .replace(" Collection", " Saga")
        .replace(" collection", " Saga")
        .trim()
        .to_string();
      tags.insert(TagType::Saga, vec![saga_name]);
    }

    let base = MediaBase {
      media_type: self.media_type.clone(),
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
        poster_path: data["poster_path"].as_str().map(|s| s.to_string()),
        backdrop_path: data["backdrop_path"].as_str().map(|s| s.to_string()),
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
