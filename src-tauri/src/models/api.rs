use serde::Deserialize;

#[derive(Deserialize)]
pub struct ApiResponse {
  pub results: Vec<serde_json::Value>,
}
