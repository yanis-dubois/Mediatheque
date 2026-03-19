/* ********** Enum ********** */

import { KeyValue } from "@angular/common";
import { Tag } from "./entity.model";

export enum MediaType {
  BOOK = "BOOK",
  MOVIE = "MOVIE",
  SERIES = "SERIES",
  VIDEO_GAME = "VIDEO_GAME",
  TABLETOP_GAME = "TABLETOP_GAME"
}

export enum MediaStatus {
  TO_DISCOVER = "TO_DISCOVER", 
  IN_PROGRESS = "IN_PROGRESS", 
  FINISHED = "FINISHED", 
  DROPPED = "DROPPED"
}

export const getStatusColor = (status: MediaStatus): string => {
  switch (status) {
    case MediaStatus.FINISHED: return "var(--color-status-finished)";
    case MediaStatus.IN_PROGRESS: return "var(--color-status-in-progress)";
    case MediaStatus.TO_DISCOVER: return "var(--color-status-to-discover)";
    case MediaStatus.DROPPED: return "var(--color-status-dropped)";
  }
};

export enum TagType {
  GENRE = "GENRE", 
  SAGA = "SAGA", 
  GAME_MECHANIC = "GAME_MECHANIC",
  RELEASE_STATUS = "RELEASE_STATUS",
  FRANCHISE = "FRANCHISE",
  GAME_MODE = "GAME_MODE",
  CAMERA_PERSPECTIVE = "CAMERA_PERSPECTIVE",
}

export const TAG_ORDER: Record<TagType, number> = {
  [TagType.RELEASE_STATUS]: 0,
  [TagType.SAGA]: 1,
  [TagType.GENRE]: 2,
  [TagType.GAME_MECHANIC]: 3,
  [TagType.FRANCHISE]: 4,
  [TagType.GAME_MODE]: 5,
  [TagType.CAMERA_PERSPECTIVE]: 6,
};

export interface LibraryEntityRelation {
  id: string;
  order?: number;
  values: string[];
}

export interface ApiEntityRelation {
  order?: number;
  values: string[];
}

export const sortEntityByOrder = (
  a: KeyValue<string, LibraryEntityRelation | ApiEntityRelation>, 
  b: KeyValue<string, LibraryEntityRelation | ApiEntityRelation>
): number => {
  const orderA = a.value.order ?? 0;
  const orderB = b.value.order ?? 0;
  return orderA - orderB;
};

/* ********** Data ********** */

// base
export interface MediaBase {
  mediaType: MediaType;
  title: string;
  releaseDate: string;
  description: string;
}

export interface LibraryMediaRelations {
  // { name: relation }
  persons: Record<string, LibraryEntityRelation>;
  cast: Record<string, LibraryEntityRelation>;
  companies: Record<string, LibraryEntityRelation>;
  // { type: [{id, tag}, ...] }
  tags: Record<TagType, Tag[]>;
}

export interface ApiMediaRelations {
  // // { name: relation }
  persons: Record<string, ApiEntityRelation>;
  cast: Record<string, ApiEntityRelation>;
  companies: Record<string, ApiEntityRelation>;
  // { type: [tags, ...] }
  tags: Record<TagType, string[]>;
}

// extension
export interface MovieExtension { 
  duration: number; 
}
export interface SeriesExtension { 
  seasons: number; 
  episodes: number; 
}
export interface VideoGameExtension { 
  synopsis: string; 
  normalPlayingTime: number; 
  completePlayingTime: number;
}
export interface TabletopGameExtension { 
  playerCount: string; 
  playingTime: string; 
}
export type MediaExtension = 
  MovieExtension | 
  SeriesExtension | 
  VideoGameExtension |
  TabletopGameExtension;

export type MediaData = 
  MediaBase & 
  Partial<MediaExtension>;

// state
export interface LibraryState {
  id: string; // UUID
  externalId?: number;
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
  id?: string;
  isInLibrary: boolean;
  posterPath?: string;
  backdropPath?: string;
}

/* ********** Type ********** */

// obtained from light SQL call
export type LibrarySearchResult = 
  MediaBase & 
  LibraryState;

// obtained from detailed SQL call
export type LibraryMedia = 
  MediaData & 
  LibraryState &
  LibraryMediaRelations;

// obtained from light API call
export type ApiSearchResult = 
  MediaBase & 
  ApiState;

// obtained from detailed API call
export type ApiMedia = 
  MediaData &
  ApiState &
  ApiMediaRelations;

/* ********** Generic Type ********** */

export type AnyApiMedia =
  ApiSearchResult | 
  ApiMedia;

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
  return 'favorite' in media;
};
export const isDetailedMedia = (media: AnyMedia): media is ApiMedia | LibraryMedia => {
  return 'persons' in media;
};
