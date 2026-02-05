export enum MediaType {
  BOOK = 'BOOK',
  MOVIE = 'MOVIE',
  SERIES = 'SERIES',
  VIDEO_GAME = 'VIDEO_GAME',
  TABLETOP_GAME = 'TABLETOP_GAME'
}

export enum MediaStatus {
  TO_DISCOVER = 'TO_DISCOVER', 
  IN_PROGRESS = 'IN_PROGRESS', 
  FINISHED = 'FINISHED', 
  DROPPED = 'DROPPED'
}

/** "IN_PROGRESS" -> "in progress" */
export const enumToName = (str: string): string => {
  return str
  .toLowerCase()
  .split('_')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');
};

/** "IN_PROGRESS" -> "in-progress" */
export const enumToPath = (str: string): string => {
  return str.toLowerCase().replace(/_/g, '-');
};

/** "in-progress" -> "IN_PROGRESS" */
const pathToString = (path: string): string => {
  return path.toUpperCase().replace(/-/g, '_');
};
export const pathToStatus = (path: string): MediaStatus => {
  return pathToString(path) as MediaStatus;
};
export const pathToMediaType = (path: string): MediaType => {
  return pathToString(path) as MediaType;
};

export interface Media {
  id: string;
  mediaType: MediaType;
  title: string;
  description: string;
  releaseDate: string;
  addedDate: string;
  status: MediaStatus;
  favorite: boolean;
  notes: string;
}

export interface ExternalMedia {
  mediaType: MediaType;
  title: string;
  imageUrl: string;
  description: string;
  releaseDate: string;
}
