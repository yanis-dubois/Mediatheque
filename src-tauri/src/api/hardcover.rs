use std::collections::HashMap;

use crate::{
  api::provider::MediaProvider,
  models::{
    api::{HardcoverByIdResponse, HardcoverContributions, HardcoverResponse},
    enums::{Language, MediaSource, MediaType, TagType},
    image::{ImageConfiguration, ImageSize, ImageType},
    media::{
      ApiEntityRelation, ApiMedia, ApiMediaRelations, ApiSearchResult, ApiState, MediaBase,
      MediaData, MediaExtension,
    },
  },
};

// utils

fn get_contribution_relation(contribution: &HardcoverContributions) -> ApiEntityRelation {
  let mut order: u32 = 999;
  let role = contribution
    .contribution
    .clone()
    .unwrap_or("AUTHOR".to_string())
    .to_uppercase();

  if role == "AUTHOR" {
    order = 1;
  }

  ApiEntityRelation {
    order: Some(order),
    values: vec![role],
  }
}

fn map_category_id(id: u32) -> Option<String> {
  match id {
    1 => Some("Book".to_string()),
    2 => Some("Novella".to_string()),
    3 => Some("Short Story".to_string()),
    4 => Some("Graphic Novel".to_string()),
    5 => Some("Fan Fiction".to_string()),
    6 => Some("Research Paper".to_string()),
    7 => Some("Poetry".to_string()),
    8 => Some("Collection".to_string()),
    9 => Some("Web Novel".to_string()),
    10 => Some("Light Novel".to_string()),
    _ => None, // default
  }
}

// provider

pub struct HardcoverProvider {
  pub source: MediaSource,
  pub token: String,
  pub base_media_url: String,
  pub image_config: ImageConfiguration,
  pub page_size: u32,
}

impl HardcoverProvider {
  pub fn new() -> Self {
    let token =
      std::env::var("HARDCOVER_API_TOKEN").unwrap_or("HARDCOVER_API_TOKEN not found".to_string());

    Self {
      source: MediaSource::Hardcover,
      token,
      base_media_url: "https://api.hardcover.app/v1/graphql".to_string(),
      image_config: Self::create_config(),
      page_size: 20,
    }
  }
}

#[async_trait::async_trait]
impl MediaProvider for HardcoverProvider {
  fn create_config() -> ImageConfiguration {
    ImageConfiguration {
      base_url: "https://production-img.hardcover.app/enlarge?url=".to_string(),
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
  ) -> Result<Vec<ApiSearchResult>, String> {
    // build request
    let body = serde_json::json!({
      "query": r#"
        query SearchBooks($query: String!, $page: Int!, $per_page: Int!) {
          search(query: $query, query_type: "Book", page: $page, per_page: $per_page) {
            results
          }
        }
      "#,
      "variables": {
        "query": query,
        "page": page,
        "per_page": self.page_size
      }
    });

    // get response
    let client = reqwest::Client::new();
    let response: HardcoverResponse = client
      .post(&self.base_media_url)
      .header("Authorization", format!("Bearer {}", &self.token))
      .header("Content-Type", "application/json")
      .json(&body)
      .send()
      .await
      .map_err(|e| e.to_string())?
      .json()
      .await
      .map_err(|e| e.to_string())?;

    // JSON -> ApiSearchResult
    let results = response
      .data
      .search
      .results
      .hits
      .into_iter()
      .map(|hit| {
        let book = hit.document;
        let external_id = book.id.parse::<u32>().unwrap_or(0);

        // extract persons
        let mut creators = Vec::new();
        for c in book.contributions.into_iter() {
          let relation = get_contribution_relation(&c);
          if relation.values.contains(&"AUTHOR".to_string()) {
            creators.push(c.author.name.clone());
          }
        }

        ApiSearchResult {
          core: MediaBase {
            media_type: MediaType::Book,
            source: self.source.clone(),
            title: book.title,
            release_date: book.release_date.unwrap_or_default(),
            description: book.description.unwrap_or_default(),
            creators,
          },
          state: ApiState {
            external_id,
            id: None,
            is_in_library: false,
            poster_path: book.image.map(|i| i.url.unwrap_or_default()),
            backdrop_path: None,
          },
        }
      })
      .collect();

    Ok(results)
  }

  async fn get_by_id(&self, external_id: u32, _language: Language) -> Result<ApiMedia, String> {
    // build request
    let query = format!(
      r#"
      query GetBookById {{
        books(where: {{id: {{_eq: {}}}}}) {{
          id
          title
          contributions {{
            author {{
              name
          }}
            contribution
          }}
          book_category_id
          book_series {{
            series {{
              name
            }}
          }}
          cached_tags
          description
          pages
          release_date
          image {{
            url
            width
            height
          }}
        }}
      }}
      "#,
      external_id,
    );

    let body = serde_json::json!({ "query": query });

    // get response
    let client = reqwest::Client::new();
    let response: HardcoverByIdResponse = client
      .post(&self.base_media_url)
      .header("Authorization", format!("Bearer {}", &self.token))
      .header("Content-Type", "application/json")
      .json(&body)
      .send()
      .await
      .map_err(|e| e.to_string())?
      .json()
      .await
      .map_err(|e| e.to_string())?;

    let book = response
      .data
      .books
      .into_iter()
      .next()
      .ok_or_else(|| "Book not found".to_string())?;

    let mut persons: HashMap<String, ApiEntityRelation> = HashMap::new();
    let mut tags: HashMap<TagType, Vec<String>> = HashMap::new();
    let mut creators: Vec<String> = Vec::new();

    // extract tags
    // genre
    for (cat_name, tag) in book.cached_tags {
      let tag_type = match cat_name.as_str() {
        "Genre" => TagType::Genre,
        _ => continue,
      };
      let tag_names = tag.into_iter().map(|t| t.tag).collect();
      tags.insert(tag_type, tag_names);
    }
    // saga
    if let Some(serie) = book.book_series.first() {
      tags.insert(TagType::Saga, vec![serie.series.name.clone()]);
    }

    // extract persons
    for c in book.contributions.into_iter() {
      let relation = get_contribution_relation(&c);
      persons.insert(c.author.name.clone(), relation.clone());
      if relation.values.contains(&"AUTHOR".to_string()) {
        creators.push(c.author.name.clone());
      }
    }

    let base = MediaBase {
      media_type: MediaType::Book,
      source: self.source.clone(),
      title: book.title,
      release_date: book.release_date.unwrap_or_default(),
      description: book.description.unwrap_or_default(),
      creators,
    };

    // add detailed infos
    let extension = {
      MediaExtension::Book {
        pages: book.pages,
        category: map_category_id(book.book_category_id),
      }
    };

    Ok(ApiMedia {
      data: MediaData { base, extension },
      state: ApiState {
        external_id,
        id: None,
        is_in_library: false,
        poster_path: book.image.map(|i| i.url.unwrap_or_default()),
        backdrop_path: None,
      },
      relations: ApiMediaRelations {
        persons,
        cast: HashMap::new(),
        companies: HashMap::new(),
        tags,
      },
    })
  }
}
