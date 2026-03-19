import { ImageSize, ImageType } from "@app/models/image.model";
import { ImageProvider } from "./image-provider.provider";

export class IgdbImageProvider implements ImageProvider {
  private readonly baseUrl = 'https://images.igdb.com/igdb/image/upload';

  getFileFormat(): string {
    return 'jpg';
  }

  getSize(type: ImageType, size: ImageSize): string {
    // poster size
    if (type === ImageType.POSTER) {
      switch (size) {
        case ImageSize.SMALL:
          return '/t_cover_small';
        case ImageSize.MEDIUM:
          return '/t_cover_big';
        case ImageSize.ORIGINAL:
          return '/t_1080p';
      }
    }
    // backdrop size
    switch (size) {
      case ImageSize.SMALL:
        return '/t_screenshot_med';
      case ImageSize.MEDIUM:
        return '/t_screenshot_huge';
      case ImageSize.ORIGINAL:
        return '/t_1080p';
    }
  }

  getPosterUrl(path: string, size: ImageSize): string {
    if (!path) return '';
    const s = this.getSize(ImageType.POSTER, size);
    return `${this.baseUrl}${s}/${path}.${this.getFileFormat()}`;
  }

  getBackdropUrl(path: string, size: ImageSize): string {
    if (!path) return '';
    const s = this.getSize(ImageType.BACKDROP, size);
    return `${this.baseUrl}${s}/${path}.${this.getFileFormat()}`;
  }
}
