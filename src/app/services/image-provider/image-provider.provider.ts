import { ImageSize, ImageType } from "../image.service";

export interface ImageProvider {
  getOriginalUrl(): string;
  getSize(type: ImageType, size: ImageSize): string;
  getPosterUrl(path: string, size?: ImageSize): string;
  getBackdropUrl(path: string, size?: ImageSize): string;
}
