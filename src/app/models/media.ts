export enum MediaType {
  BOOK,
  MOVIE,
  TV_SHOW,
  VIDEO_GAME,
  TABLETOP_GAME
}

export enum MediaStatus {
  TO_DISCOVER, 
  IN_PROGRESS, 
  FINISHED, 
  DROPPED
}

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
