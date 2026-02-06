import { Media, MediaType } from '@models/media.model';
import { MediaOrder } from './media-query.model';

export interface Collection {
  id: string;
  name: string;

  collectionType: CollectionType;
  mediaType: CollectionMediaType;

  addedDate: string;

  favorite: boolean;
  description: string;

  sortOrder: MediaOrder[];
  preferedView: CollectionView;

  hasImage: boolean;

  mediaList: Media[];
}

export enum CollectionType {
  MANUAL = "MANUAL",
  DYNAMIC = "DYNAMIC"
}

export type CollectionMediaType = 
  | { type: 'ALL' } 
  | { type: 'SPECIFIC', value: MediaType };

export enum CollectionView {
  GRID = "GRID",
  ROW = "ROW",
  COLUMN = "COLUMN"
}
