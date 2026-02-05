import { ExternalMedia, Media } from '@models/media.model';

/* data that came from local DB */

export interface Movie extends Media {
  directors: string[];
  genre: string[];
  serie?: string;
  duration: number;
}

export interface Series extends Media {
  creators: string[];
  genre: string[];
  seasons: number;
  episodes: number;
}

export interface TabletopGame extends Media {
  designers: string[];
  artists: string[];
  publishers: string[];
  gameMechanics: string[];
  playerCount: string;
  playingTime: string;
}

/* data that came from API */

export interface ExternalMovie extends ExternalMedia {
  directors: string[];
  genre: string[];
  serie?: string;
  duration: number;
}

export interface ExternalSeries extends ExternalMedia {
  creators: string[];
  genre: string[];
  seasons: number;
  episodes: number;
}

export interface ExternalTabletopGame extends ExternalMedia {
  designers: string[];
  artists: string[];
  publishers: string[];
  gameMechanics: string[];
  playerCount: string;
  playingTime: string;
}
