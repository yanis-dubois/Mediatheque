import { MediaStatus } from "./media";

export enum CollectionQueryType {
  SIMPLE,
  ALL,
  FAVORITE,
  STATUS,
  RECENT,
}

export type CollectionQuery =
  | { type: CollectionQueryType.ALL;}
  | { type: CollectionQueryType.SIMPLE; id: number }
  | { type: CollectionQueryType.STATUS; status: MediaStatus }
  | { type: CollectionQueryType.FAVORITE;}
  | { type: CollectionQueryType.RECENT;};
