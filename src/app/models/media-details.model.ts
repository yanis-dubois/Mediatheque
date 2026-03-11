import { Media } from '@models/media.model';

export interface Descriptor {
  id: number;
  name: string;
}

/* data that came from local DB */

export interface Movie extends Media {
  directors: Descriptor[];
  genre: Descriptor[];
  saga: Descriptor[];
  duration: number;
}

export interface Series extends Media {
  creators: Descriptor[];
  genre: Descriptor[];
  seasons: number;
  episodes: number;
}

export interface TabletopGame extends Media {
  designers: Descriptor[];
  artists: Descriptor[];
  publishers: Descriptor[];
  gameMechanics: Descriptor[];
  playerCount: string;
  playingTime: string;
}
