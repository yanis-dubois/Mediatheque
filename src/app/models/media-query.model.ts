import { ScreenSize } from "@app/services/screen.service";
import { CollectionDisplayMode, CollectionLayout } from "./collection.model";
import { MediaStatus, MediaType } from "./media.model";

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
    return screenSize === ScreenSize.MOBILE ? 4 : 8; // 8 / 16
  }
  if (layout === CollectionLayout.LIST) {
    return 4; // 16
  }
  return screenSize === ScreenSize.MOBILE ? 4 : 8; // 32 / 64
};
