import { Media, MediaStatus, MediaType } from "./media.model";

export interface GetMediaOptions {
  filter?: MediaFilter;
  order?: MediaOrder[];
  page?: Pagination;
}

export enum MediaOrderField {
  ADDED_DATE = 'ADDED_DATE',
  RELEASE_DATE = 'RELEASE_DATE',
  MEDIA_TYPE = 'MEDIA_TYPE',
  FAVORITE = 'FAVORITE',
  STATUS = 'STATUS',
}

export enum MediaOrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface MediaFilter {
  mediaType?: MediaType;
  status?: MediaStatus;
  favoriteOnly?: boolean;
  searchQuery?: string;
}

export interface MediaOrder {
  field: MediaOrderField;
  direction: MediaOrderDirection;
}

export interface Pagination {
  limit: number;
  offset: number;
}

// TODO : La réponse structurée pour le total_count
export interface PaginatedMedia {
  items: Media[];
  totalCount: number;
}
