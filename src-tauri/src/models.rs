use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Media {
  pub id: i32,
  pub name: String,
  pub description: String,
  pub image_url: String,
}
