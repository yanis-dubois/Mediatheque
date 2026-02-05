import { MediaStatus, MediaType } from "./media.model";

export enum CollectionQueryType {
  SIMPLE = "simple",
  ALL = "all",
  MEDIA_TYPE = "media-type",
  FAVORITE = "favorite",
  RECENT = "recent",
  STATUS = "status",
}

export type CollectionQuery =
  | { type: CollectionQueryType.SIMPLE; id: number; }
  | { type: CollectionQueryType.ALL; }
  | { type: CollectionQueryType.MEDIA_TYPE; mediaType: MediaType; }
  | { type: CollectionQueryType.FAVORITE; }
  | { type: CollectionQueryType.RECENT; limit?: number; }
  | { type: CollectionQueryType.STATUS; status: MediaStatus; };
