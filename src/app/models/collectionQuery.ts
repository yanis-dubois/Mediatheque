import { MediaStatus } from "./media";

export enum CollectionQueryType {
  SIMPLE,
  ALL,
  FAVORITES,
  STATUS,
  RECENT,
}

export type CollectionQuery =
  | { type: CollectionQueryType.ALL;}
  | { type: CollectionQueryType.SIMPLE; id: number }
  | { type: CollectionQueryType.STATUS; status: MediaStatus }
  | { type: CollectionQueryType.FAVORITES;}
  | { type: CollectionQueryType.RECENT;};
