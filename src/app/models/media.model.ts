/* ********** Enum ********** */

export enum MediaType {
  BOOK = 'BOOK',
  MOVIE = 'MOVIE',
  SERIES = 'SERIES',
  VIDEO_GAME = 'VIDEO_GAME',
  TABLETOP_GAME = 'TABLETOP_GAME'
}

export enum MediaStatus {
  TO_DISCOVER = 'TO_DISCOVER', 
  IN_PROGRESS = 'IN_PROGRESS', 
  FINISHED = 'FINISHED', 
  DROPPED = 'DROPPED'
}

export const getStatusColor = (status: MediaStatus): string => {
  switch (status) {
    case MediaStatus.FINISHED: return 'var(--color-status-finished)';
    case MediaStatus.IN_PROGRESS: return 'var(--color-status-in-progress)';
    case MediaStatus.TO_DISCOVER: return 'var(--color-status-to-discover)';
    case MediaStatus.DROPPED: return 'var(--color-status-dropped)';
  }
};

export enum TagType {
  GENRE = 'GENRE', 
  SAGA = 'SAGA', 
  GAME_MECHANIC = 'GAME_MECHANIC',
}

/* ********** Data ********** */

// base
export interface MediaCore {
  mediaType: MediaType;
  title: string;
  releaseDate: string;
  description: string;
}
export interface MediaRelations {
  // { name: [roles, ...] }
  persons: Record<string, string[]>;
  companies: Record<string, string[]>;
  // { type: [tags, ...] }
  tags: Partial<Record<TagType, string[]>>;
}
export type MediaBase = 
  MediaCore & 
  MediaRelations;

// extension
export interface MovieExtension { 
  duration: number; 
}
export interface SeriesExtension { 
  seasons: number; 
  episodes: number; 
}
export interface TabletopGameExtension { 
  playerCount: string; 
  playingTime: string; 
}
export type MediaExtension = 
  MovieExtension | 
  SeriesExtension | 
  TabletopGameExtension;

export type MediaData = 
  MediaBase & 
  Partial<MediaExtension>;

// state
export interface LibraryState {
  id: string; // UUID
  externalId: number;
  addedDate: string;
  status: MediaStatus;
  favorite: boolean;
  notes: string;
  score?: number;
  hasPoster: boolean;
  hasBackdrop: boolean;
  posterWidth: number;
  posterHeight: number;
}
export interface ApiState {
  externalId: number;
  isInLibrary: boolean;
  posterPath?: string;
  backdropPath?: string;
}

/* ********** Type ********** */

// obtained from light API call
export type LibrarySearchResult = 
  MediaCore & 
  LibraryState;

// obtained from SQL call
export type LibraryMedia = 
  MediaData & 
  LibraryState;

// obtained from light API call
export type ApiSearchResult = 
  MediaCore & 
  ApiState;

// obtained from detailed API call
export type ApiMedia = 
  MediaData &
  ApiState;

export type DetailedMedia = 
  LibraryMedia |
  ApiMedia;

// generic media
export type AnyMedia = 
  LibrarySearchResult |
  LibraryMedia |
  ApiSearchResult | 
  ApiMedia;

// type guard
export const isLibraryMedia = (media: AnyMedia): media is LibraryMedia  => {
  return 'id' in media;
};
export const hasRelations = (media: AnyMedia): media is ApiMedia | LibraryMedia => {
  return 'persons' in media;
};
export const isAnyApiMedia = (media: AnyMedia): media is ApiMedia | ApiSearchResult => {
  return !('id' in media);
};
