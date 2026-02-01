use serde::Serialize;

use crate::models::movie::MovieDetails;

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum MediaDetails {
  MOVIE(MovieDetails),
}
