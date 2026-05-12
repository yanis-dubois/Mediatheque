/* ********** Enum ********** */

import { KeyValue } from "@angular/common";
import { Tag } from "./entity.model";

export enum MediaSource {
  MANUAL = "MANUAL",
  TMDB = "TMDB",
  IGDB = "IGDB", 
  HARCOVER = "HARDCOVER",
  BGG = "BGG"
}

export enum MediaType {
  BOOK = "BOOK",
  MOVIE = "MOVIE",
  SERIES = "SERIES",
  VIDEO_GAME = "VIDEO_GAME",
  TABLETOP_GAME = "TABLETOP_GAME"
}

export enum MediaStatus {
  FINISHED = "FINISHED", 
  IN_PROGRESS = "IN_PROGRESS", 
  TO_DISCOVER = "TO_DISCOVER", 
  DROPPED = "DROPPED"
}

export enum MediaPossessionStatus {
  OWNED = "OWNED", 
  BORROWED = "BORROWED", 
  WANTED = "WANTED", 
  NOT_OWNED = "NOT_OWNED"
}

export const getStatusColor = (status: MediaStatus): string => {
  switch (status) {
    case MediaStatus.FINISHED: return "var(--color-status-finished)";
    case MediaStatus.IN_PROGRESS: return "var(--color-status-in-progress)";
    case MediaStatus.TO_DISCOVER: return "var(--color-status-to-discover)";
    case MediaStatus.DROPPED: return "var(--color-status-dropped)";
  }
};

export const getPossessionStatusColor = (status: MediaPossessionStatus): string => {
  switch (status) {
    case MediaPossessionStatus.OWNED: return "var(--color-status-owned)";
    case MediaPossessionStatus.BORROWED: return "var(--color-status-borrowed)";
    case MediaPossessionStatus.WANTED: return "var(--color-status-wanted)";
    case MediaPossessionStatus.NOT_OWNED: return "var(--color-status-not-owned)";
  }
};

export enum TagType {
  GENRE = "GENRE", // all
  SAGA = "SAGA", // all
  GAME_MECHANIC = "GAME_MECHANIC", // videoGame + tabletopGame
  RELEASE_STATUS = "RELEASE_STATUS", // videoGame
  FRANCHISE = "FRANCHISE", // videoGame
  GAME_MODE = "GAME_MODE", // videoGame
  CAMERA_PERSPECTIVE = "CAMERA_PERSPECTIVE", // videoGame
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
  source: MediaSource;
  title: string;
  releaseDate: string;
  description: string;
  creators: string[];
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
  // { name: relation }
  persons: Record<string, ApiEntityRelation>;
  cast: Record<string, ApiEntityRelation>;
  companies: Record<string, ApiEntityRelation>;
  // { type: [tags, ...] }
  tags: Record<TagType, string[]>;
}

// extension
export interface MovieExtension { 
  duration?: number; 
}
export interface SeriesExtension { 
  seasons?: number; 
  episodes?: number; 
}
export interface VideoGameExtension { 
  synopsis?: string; 
  normalPlayingTime?: number; 
  completePlayingTime?: number;
}
export interface TabletopGameExtension { 
  minPlayers?: number; 
  maxPlayers?: number; 
  minPlayingTime?: number; 
  maxPlayingTime?: number;
}
export interface BookExtension { 
  pages?: number; 
  category?: string; 
}
export type MediaExtension = 
  BookExtension |
  MovieExtension | 
  SeriesExtension | 
  VideoGameExtension |
  TabletopGameExtension;

export type MediaData = 
  MediaBase & 
  Partial<MovieExtension> &
  Partial<SeriesExtension> &
  Partial<VideoGameExtension> &
  Partial<TabletopGameExtension> &
  Partial<BookExtension>;

// state
export interface LibraryState {
  id: string; // UUID
  externalId?: number;
  addedDate: string;
  status: MediaStatus;
  possessionStatus: MediaPossessionStatus;
  statusUpdate: String;
  possessionStatusUpdate: String;
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
export interface DtoState {
  hasPoster: boolean;
  hasBackdrop: boolean;
  posterWidth: number;
  posterHeight: number;
  posterDeleted: boolean;
  backdropDeleted: boolean;
  newPosterPath?: string;
  newBackdropPath?: string;
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

// used to send data to backend while editing a media
export type MediaDto = 
  MediaBase &
  ApiMediaRelations &
  DtoState &
  Partial<MovieExtension> &
  Partial<SeriesExtension> &
  Partial<VideoGameExtension> &
  Partial<TabletopGameExtension> &
  Partial<BookExtension>;

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

/* ********** Utils ********** */

// type guard
export const isLibraryMedia = (media: AnyMedia): media is LibraryMedia  => {
  return 'favorite' in media;
};
export const isDetailedMedia = (media: AnyMedia): media is ApiMedia | LibraryMedia => {
  return 'persons' in media;
};

// convert from LibraryMedia to MediaDto
export function LibraryMediaToDto(libraryMedia: LibraryMedia | null): MediaDto | null {
  if (!libraryMedia) return null;

  // init data
  const dto: MediaDto = {
    title: libraryMedia.title,
    mediaType: libraryMedia.mediaType,
    releaseDate: libraryMedia.releaseDate,
    description: libraryMedia.description,
    creators: [...libraryMedia.creators],
    source: libraryMedia.source,

    // simplify relations (from LibraryMediaRelations to ApiMediaRelations)
    persons: mapToApiEntityRelation(libraryMedia.persons),
    cast: mapToApiEntityRelation(libraryMedia.cast),
    companies: mapToApiEntityRelation(libraryMedia.companies),
    tags: mapTagsToNames(libraryMedia.tags),

    // image data
    hasPoster: libraryMedia.hasPoster,
    hasBackdrop: libraryMedia.hasBackdrop,
    posterWidth: libraryMedia.posterWidth,
    posterHeight: libraryMedia.posterHeight,
    posterDeleted: false,
    backdropDeleted: false,
  };

  // fill the extension fields
  switch (libraryMedia.mediaType) {
    case MediaType.MOVIE:
      const movie = libraryMedia as MovieExtension;
      dto.duration = movie.duration;
      break;

    case MediaType.SERIES:
      const serie = libraryMedia as SeriesExtension;
      dto.seasons = serie.seasons;
      dto.episodes = serie.episodes;
      break;

    case MediaType.VIDEO_GAME:
      const videoGame = libraryMedia as VideoGameExtension;
      dto.synopsis = videoGame.synopsis;
      dto.normalPlayingTime = videoGame.normalPlayingTime;
      dto.completePlayingTime = videoGame.completePlayingTime;
      break;

    case MediaType.TABLETOP_GAME:
      const tabletopGame = libraryMedia as TabletopGameExtension;
      dto.minPlayers = tabletopGame.minPlayers;
      dto.maxPlayers = tabletopGame.maxPlayers;
      dto.minPlayingTime = tabletopGame.minPlayingTime;
      dto.maxPlayingTime = tabletopGame.maxPlayingTime;
      break;

    case MediaType.BOOK:
      const book = libraryMedia as BookExtension;
      dto.pages = book.pages;
      dto.category = book.category;
      break;
  }

  return dto;
}
function mapToApiEntityRelation(
  source: Record<string, LibraryEntityRelation>
): Record<string, ApiEntityRelation> {
  const target: Record<string, ApiEntityRelation> = {};

  for (const [key, relation] of Object.entries(source)) {
    target[key] = {
      order: relation.order,
      values: [...relation.values]
    };
  }

  return target;
}
function mapTagsToNames(
  source: Record<TagType, Tag[]>
): Record<TagType, string[]> {
  const target: Partial<Record<TagType, string[]>> = {};

  for (const [type, tags] of Object.entries(source)) {
    target[type as TagType] = tags.map(tag => tag.name);
  }

  return target as Record<TagType, string[]>;
}
