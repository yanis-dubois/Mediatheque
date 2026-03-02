import { Media, MediaStatus, MediaType } from "./media.model";

export enum MediaOrderField {
  TITLE = 'TITLE',
  ADDED_DATE = 'ADDED_DATE',
  RELEASE_DATE = 'RELEASE_DATE',
  MEDIA_TYPE = 'MEDIA_TYPE',
  FAVORITE = 'FAVORITE',
  STATUS = 'STATUS',
  SCORE = 'SCORE',
}

export enum MediaOrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface MediaOrder {
  field: MediaOrderField;
  direction: MediaOrderDirection;
}

export interface MediaFilter {
  mediaType?: MediaType;
  status?: MediaStatus;
  favoriteOnly?: boolean;
  searchQuery?: string;

  // specific filed
  person?: string;
  genres?: string[];
  serie?: string;
}

// TODO : La réponse structurée pour le total_count
export interface PaginatedMedia {
  items: Media[];
  totalCount: number;
}
