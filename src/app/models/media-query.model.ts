import { Media, MediaStatus, MediaType } from "./media.model";

export enum MediaOrderField {
  ADDED_DATE = 'added_date',
  RELEASE_DATE = 'release_date',
  MEDIA_TYPE = 'media_type',
  FAVORITE = 'favorite',
  STATUS = 'status',
}

export enum MediaOrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface GetMediaOptions {
  filter?: MediaFilter;
  order?: MediaOrder[];
  page?: Pagination;
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
