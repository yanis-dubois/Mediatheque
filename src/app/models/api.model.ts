import { MediaType } from "./media.model";

export interface ApiSearchResult {
  id: number;
  title: string;
  releaseDate: string;
  mediaType: MediaType;
  posterPath: string;
  overview: string;
  isInLibrary: boolean;
}
