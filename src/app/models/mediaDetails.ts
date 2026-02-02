import { Media } from '@models/media';

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
