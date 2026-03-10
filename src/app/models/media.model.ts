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

export const getStatusColor = (status: MediaStatus): string => {
  switch (status) {
    case MediaStatus.FINISHED: return 'var(--color-status-finished)';
    case MediaStatus.IN_PROGRESS: return 'var(--color-status-in-progress)';
    case MediaStatus.TO_DISCOVER: return 'var(--color-status-to-discover)';
    case MediaStatus.DROPPED: return 'var(--color-status-dropped)';
  }
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
  externalId: number;
  mediaType: MediaType;
  imageWidth: number;
  imageHeight: number;
  title: string;
  description: string;
  releaseDate: string;
  addedDate: string;
  status: MediaStatus;
  favorite: boolean;
  notes: string;
  score?: number;
  contextual_roles?: string;
}

export interface ExternalMedia {
  mediaType: MediaType;
  title: string;
  imageUrl: string;
  description: string;
  releaseDate: string;
}
