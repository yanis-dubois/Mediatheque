use serde::Serialize;

use crate::models::enums::CollectionMediaType;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PinEntry {
  pub collection_id: String,
  pub context: CollectionMediaType,
  pub position: i32,
}
