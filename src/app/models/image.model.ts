export enum ImageSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  ORIGINAL = "ORIGINAL"
}

export const get_image_size_file_name = (size: ImageSize): string => {
  return size.toString().toLowerCase();
}

export enum ImageType {
  POSTER = "POSTER",
  BACKDROP = "BACKDROP",
}

export const get_image_type_file_name = (type: ImageType): string => {
  return type.toString().toLowerCase() + 's';
}

export interface ImageConfiguration {
  baseUrl: string;
  format: string;
  // { Type (Poster/Backdrop): { Size (Small/Medium/Original): Suffixe (w342/...) } }
  sizes: Record<ImageType, Record<ImageSize, string>>;
}
