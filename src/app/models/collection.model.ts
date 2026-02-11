import { MediaType } from '@models/media.model';
import { MediaFilter, MediaOrder } from '@models/media-query.model';

export interface Collection {
  id: string;
  name: string;

  collectionType: CollectionType;
  mediaType: CollectionMediaType;

  addedDate: string;

  favorite: boolean;
  description: string;

  sortOrder: MediaOrder[];
  filter: MediaFilter;
  preferredLayout: CollectionLayout;

  hasImage: boolean;
}

export enum CollectionType {
  MANUAL = "MANUAL",
  DYNAMIC = "DYNAMIC"
}

export type CollectionMediaType = 
  | { type: 'ALL' } 
  | { type: 'SPECIFIC', value: MediaType };

export enum CollectionLayout {
  GRID = "GRID",
  ROW = "ROW",
  COLUMN = "COLUMN",
  LIST = "LIST"
}

export enum CollectionDisplayMode {
  PREVIEW = "PREVIEW",
  DETAILS = "DETAILS"
}
