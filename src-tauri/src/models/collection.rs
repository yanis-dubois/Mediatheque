use serde::{Serialize};
use crate::models::{enums::CollectionView, media::Media, query::MediaOrder};

use super::enums::{CollectionType, CollectionMediaType};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
  pub id: String,
  pub name: String,

  pub collection_type: CollectionType,
  pub media_type: CollectionMediaType,

  pub added_date: String,

  pub favorite: bool,
  pub description: String,

  pub sort_order: Vec<MediaOrder>,
  pub prefered_view: CollectionView,

  pub has_image: bool,

  pub media_list: Vec<Media>
}
