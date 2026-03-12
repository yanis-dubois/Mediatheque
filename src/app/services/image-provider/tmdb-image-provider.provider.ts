import { ImageSize, ImageType } from "../image.service";
import { ImageProvider } from "./image-provider.provider";

export class TmdbImageProvider implements ImageProvider {
  private readonly baseUrl = 'https://image.tmdb.org/t/p';

  getOriginalUrl(): string {
    return this.baseUrl + this.getSize(ImageType.POSTER, ImageSize.ORIGINAL);
  }

  getSize(type: ImageType, size: ImageSize): string {
    // poster size
    if (type === ImageType.POSTER) {
      switch (size) {
        case ImageSize.SMALL:
          return '/w92';
        case ImageSize.MEDIUM:
          return '/w500';
        case ImageSize.ORIGINAL:
          return '/original';
      }
    }
    // backdrop size
    switch (size) {
      case ImageSize.SMALL:
        return '/w300';
      case ImageSize.MEDIUM:
        return '/w780';
      case ImageSize.ORIGINAL:
        return '/original';
    }
  }

  getPosterUrl(path: string, size: ImageSize): string {
    if (!path) return '';
    const s = this.getSize(ImageType.POSTER, size);
    return `${this.baseUrl}${s}${path}`;
  }

  getBackdropUrl(path: string, size: ImageSize): string {
    if (!path) return '';
    const s = this.getSize(ImageType.BACKDROP, size);
    return `${this.baseUrl}${s}${path}`;
  }
}
