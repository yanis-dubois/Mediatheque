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

  preferredLayout: CollectionLayout;
  sortOrder: MediaOrder[];
  filter: MediaFilter;

  hasImage: boolean;
  canBeSorted: boolean;
}

export interface ExternalCollection {
  collectionType: CollectionType;
  mediaType: CollectionMediaType;
}

export enum CollectionType {
  MANUAL = "MANUAL",
  DYNAMIC = "DYNAMIC",
  SYSTEM = "SYSTEM"
}

export type CollectionMediaType = 
  | { type: 'ALL' } 
  | { type: 'SPECIFIC', value: MediaType };
export function compareCollectionMediaType(a: CollectionMediaType, b: CollectionMediaType): boolean {
  // one ALL one SPECIFIC
  if (a.type !== b.type) return false;
  // both SPECIFIC
  if (a.type === 'SPECIFIC' && b.type === 'SPECIFIC') {
    return a.value === b.value;
  }
  // both ALL
  return true;
}

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
