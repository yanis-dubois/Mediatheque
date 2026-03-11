import { MediaType } from "./media.model";

export interface ApiSearchResult {
  id: number;
  mediaType: MediaType;
  title: string;
  releaseDate: string;
  posterPath: string;
  overview: string;
  isInLibrary: boolean;
}

export interface ExternalMedia {
  externalId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string;
  backdropPath: string;
  description: string;
  releaseDate: string;
  // {name: [roles]}
  persons: Record<string, string[]>;
  companies: Record<string, string[]>;
}

export interface ExternalMovie extends ExternalMedia {
  genre: string[];
  saga: string[];
  duration: number;
}

export interface ExternalSeries extends ExternalMedia {
  genre: string[];
  seasons: number;
  episodes: number;
}

export interface ExternalTabletopGame extends ExternalMedia {
  gameMechanics: string[];
  playerCount: string;
  playingTime: string;
}
