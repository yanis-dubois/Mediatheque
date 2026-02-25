use serde::{Deserialize, Serialize};
use crate::models::{enums::CollectionLayout, query::{MediaFilter, MediaOrder}};

use super::enums::{CollectionType, CollectionMediaType};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
  pub id: String,
  pub name: String,

  pub collection_type: CollectionType,
  pub media_type: CollectionMediaType,
  pub can_be_sorted: bool,

  pub added_date: String,

  pub favorite: bool,
  pub description: String,

  pub sort_order: Vec<MediaOrder>,
  pub filter: MediaFilter,
  pub preferred_layout: CollectionLayout,

  pub has_image: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalCollection {
  pub collection_type: CollectionType,
  pub media_type: CollectionMediaType,
}
