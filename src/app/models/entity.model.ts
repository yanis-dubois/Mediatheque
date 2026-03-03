export enum EntityType {
  MEDIA = "MEDIA",
  COLLECTION = "COLLECTION",
  PERSON = "PERSON",
  COMPANY = "COMPANY",
  GENRE = "GENRE",
  GAME_MECHANIC = "GAME_MECHANIC",
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
}
