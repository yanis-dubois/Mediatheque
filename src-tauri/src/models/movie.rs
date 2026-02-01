use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MovieDetails {
  pub directors: Vec<String>,
  pub genre: Vec<String>,
  pub serie: Option<String>,
  pub duration: i32,
}
