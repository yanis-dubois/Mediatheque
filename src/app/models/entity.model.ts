import { Collection } from "./collection.model";
import { LibraryMedia } from "./media.model";

export enum EntityType {
  MEDIA = "MEDIA",
  COLLECTION = "COLLECTION",
  PERSON = "PERSON",
  COMPANY = "COMPANY",
  SAGA = "SAGA",
  GENRE = "GENRE",
  GAME_MECHANIC = "GAME_MECHANIC",
}

export enum MetadataType {
  PERSON = "PERSON",
  COMPANY = "COMPANY",
  SAGA = "SAGA",
  GENRE = "GENRE",
  GAME_MECHANIC = "GAME_MECHANIC",
}

export type DetailedEntity = (LibraryMedia & { type: EntityType.MEDIA }) 
  | (Collection & { type: EntityType.COLLECTION }) 
  | (Person & { type: EntityType.PERSON })
  | (Company & { type: EntityType.COMPANY })
  | (Tag & { type: EntityType.SAGA })
  | (Tag & { type: EntityType.GENRE })
  | (Tag & { type: EntityType.GAME_MECHANIC });



export interface Person {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}
