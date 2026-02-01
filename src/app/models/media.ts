export enum MediaType {
  BOOK = 'BOOK',
  MOVIE = 'MOVIE',
  TV_SHOW = 'TV_SHOW',
  VIDEO_GAME = 'VIDEO_GAME',
  TABLETOP_GAME = 'TABLETOP_GAME'
}

export enum MediaStatus {
  TO_DISCOVER = 'TO_DISCOVER', 
  IN_PROGRESS = 'IN_PROGRESS', 
  FINISHED = 'FINISHED', 
  DROPPED = 'DROPPED'
}

/** "IN_PROGRESS" -> "in progress" */
export const enumToName = (str: string): string => {
  return str
  .toLowerCase()
  .split('_')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');
};

/** "IN_PROGRESS" -> "in-progress" */
export const enumToPath = (str: string): string => {
  return str.toLowerCase().replace(/_/g, '-');
};

/** "in-progress" -> "IN_PROGRESS" */
const pathToString = (path: string): string => {
  return path.toUpperCase().replace(/-/g, '_');
};
export const pathToStatus = (path: string): MediaStatus => {
  return pathToString(path) as MediaStatus;
};
export const pathToType = (path: string): MediaType => {
  return pathToString(path) as MediaType;
};

export interface Media {
  id: number;
  mediaType: MediaType;
  title: string;
  imageUrl: string;
  description: string;
  releaseDate: string;
  addedDate: string;
  status: MediaStatus;
  favorite: boolean;
  notes: string;
}

export type MediaDetails =
  | { 
    type: MediaType.BOOK; 
    author: string[];
    genre: string[];
    serie: string;
    pages: number; 
  }
  | { 
    type: MediaType.MOVIE; 
    directors: string[]; 
    genre: string[];
    serie: string;
    duration: number;
  }
  | { 
    type: MediaType.TV_SHOW; 
    directors: string[]; 
    genre: string[];
    seasons: number;
    episodes: number;
  }
  | { 
    type: MediaType.VIDEO_GAME; 
    developers: string[];
    publishers: string[];
    genre: string[];
    theme: string[];
    gamemodes: string[];
    serie: string;
    platforms: string[];
  }
  | { 
    type: MediaType.TABLETOP_GAME;
    designers: string[];
    artists: string[];
    publishers: string[];
    gamemodes: string[];
    mechanics: string[];
  };
