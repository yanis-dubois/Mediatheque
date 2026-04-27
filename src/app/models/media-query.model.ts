import { ScreenSize } from "@app/services/screen.service";
import { CollectionDisplayMode, CollectionLayout } from "./collection.model";
import { ApiSearchResult, MediaStatus, MediaType } from "./media.model";

export interface ApiSearchResultCount {
  results: ApiSearchResult[],
  count: number,
}

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

export interface Pagination {
  limit: number;
  offset: number;
}

export const getPaginationLimit = (
  screenSize: ScreenSize,
  layout: CollectionLayout, 
  mode = CollectionDisplayMode.DETAILS,
) => {
  if (mode === CollectionDisplayMode.PREVIEW) {
    if (screenSize === ScreenSize.MOBILE) return 8;
    if (screenSize === ScreenSize.TABLET) return 12;
    return 16;
  }
  if (layout === CollectionLayout.LIST) {
    return 16;
  }
  if (screenSize === ScreenSize.MOBILE) return 32;
  if (screenSize === ScreenSize.TABLET) return 48;
  return 64;
};

export const collectionsPaginationLimit = 12;
