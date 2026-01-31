import { MediaStatus } from "./media";

export enum CollectionQueryType {
  SIMPLE, 
  ALL, 
  FAVORITES, 
  STATUS, 
  TAG
}

export type CollectionQuery =
  | { type: CollectionQueryType.ALL;}
  | { type: CollectionQueryType.SIMPLE; id: number }
  | { type: CollectionQueryType.TAG; tag: string }
  | { type: CollectionQueryType.STATUS; status: MediaStatus }
  | { type: CollectionQueryType.FAVORITES;};
