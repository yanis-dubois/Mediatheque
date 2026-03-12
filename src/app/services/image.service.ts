import { Injectable } from "@angular/core";
import { ImageProvider } from "./image-provider/image-provider.provider";
import { TmdbImageProvider } from "./image-provider/tmdb-image-provider.provider";
import { MediaType } from "@app/models/media.model";

export enum ImageSize {
  SMALL,
  MEDIUM,
  ORIGINAL
}

export enum ImageType {
  POSTER,
  BACKDROP,
}

@Injectable({ providedIn: 'root' })
export class ImageService {
  // TODO: change that for other API
  private providers: Record<MediaType, ImageProvider> = {
    [MediaType.BOOK]: new TmdbImageProvider(),
    [MediaType.MOVIE]: new TmdbImageProvider(),
    [MediaType.SERIES]: new TmdbImageProvider(),
    [MediaType.VIDEO_GAME]: new TmdbImageProvider(),
    [MediaType.TABLETOP_GAME]: new TmdbImageProvider(),
  };

  resolveUrl(source: MediaType, type: ImageType, path: string | undefined, size: ImageSize): string {
    const provider = this.providers[source];
    if (!provider || !path) return '';

    return type === ImageType.POSTER
      ? provider.getPosterUrl(path, size) 
      : provider.getBackdropUrl(path, size);
  }

  getOriginalUrl(source: MediaType): string {
    return this.providers[source].getOriginalUrl();
  }
}
