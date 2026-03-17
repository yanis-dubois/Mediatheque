import { ImageSize, ImageType } from "@app/models/image.model";

export interface ImageProvider {
  getFileFormat(): string;
  getSize(type: ImageType, size: ImageSize): string;
  getPosterUrl(path: string, size?: ImageSize): string;
  getBackdropUrl(path: string, size?: ImageSize): string;
}
