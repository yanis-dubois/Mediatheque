import { inject, Injectable } from "@angular/core";
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';

import { join } from "@tauri-apps/api/path";
import { exists } from '@tauri-apps/plugin-fs';

import { ImageProvider } from "./image-provider/image-provider.provider";
import { TmdbImageProvider } from "./image-provider/tmdb-image-provider.provider";
import { MediaType } from "@app/models/media.model";
import { FileService } from "./file.services";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ImageSize, ImageType } from "@app/models/image.model";
import { map } from "rxjs";
import { IgdbImageProvider } from "./image-provider/igdb-image-provider.provider";

@Injectable({ providedIn: 'root' })
export class ImageService {

  private breakpointObserver = inject(BreakpointObserver);
  private fileService = inject(FileService);

  // cache that memorize image path
  private readonly MAX_CACHE_SIZE = 500;
  private pathCache = new Map<string, string | null>();

  // TODO: change that for other API
  private providers: Record<MediaType, ImageProvider> = {
    [MediaType.BOOK]: new TmdbImageProvider(),
    [MediaType.MOVIE]: new TmdbImageProvider(),
    [MediaType.SERIES]: new TmdbImageProvider(),
    [MediaType.VIDEO_GAME]: new IgdbImageProvider(),
    [MediaType.TABLETOP_GAME]: new TmdbImageProvider(),
  };

  // size priorities for fallback image search
  private sizePriorities: Record<ImageSize, ImageSize[]> = {
    [ImageSize.ORIGINAL]: [ImageSize.ORIGINAL, ImageSize.MEDIUM, ImageSize.SMALL],
    [ImageSize.MEDIUM]: [ImageSize.MEDIUM, ImageSize.SMALL, ImageSize.ORIGINAL],
    [ImageSize.SMALL]: [ImageSize.SMALL, ImageSize.MEDIUM, ImageSize.ORIGINAL],
  };

  // define break points
  private readonly MOBILE_QUERY = '(max-width: 599px)';
  private readonly TABLET_QUERY = '(min-width: 600px) and (max-width: 1023px)';
  private readonly DESKTOP_QUERY = '(min-width: 1024px)';
  // define an image size depending on screen width
  readonly screenType = toSignal(
    this.breakpointObserver
      .observe([this.MOBILE_QUERY, this.TABLET_QUERY, this.DESKTOP_QUERY])
      .pipe(
        map(result => {
          if (result.breakpoints[this.MOBILE_QUERY]) return ImageSize.SMALL;
          if (result.breakpoints[this.TABLET_QUERY]) return ImageSize.MEDIUM;
          return ImageSize.ORIGINAL;
        })
      ),
    { initialValue: ImageSize.ORIGINAL }
  );

  getRecommendedSize(context: 'detail' | 'card'): ImageSize {
    const current = this.screenType();

    // media-cards can't be at original size
    if (context === 'card') {
      return current === ImageSize.ORIGINAL ? ImageSize.MEDIUM : current;
    }

    // media-detail poster can't be at small size
    return current === ImageSize.SMALL ? ImageSize.MEDIUM : current;
  }

  resolveExternalUrl(path: string | undefined, source: MediaType, type: ImageType, size: ImageSize): string {
    const provider = this.providers[source];
    if (!provider || !path) return '';

    return type === ImageType.POSTER
      ? provider.getPosterUrl(path, size) 
      : provider.getBackdropUrl(path, size);
  }

  async resolveLocalUrl(id: string, source: MediaType, type: ImageType, size: ImageSize): Promise<string | null> {
    const appDataPath = this.fileService.appDataPath();
    if (!appDataPath) return null;

    const cacheKey = `${id}-${type}-${size}`;
    if (this.pathCache.has(cacheKey)) {
      const value = this.pathCache.get(cacheKey)!;
      if (value) {
        this.pathCache.delete(cacheKey);
        this.pathCache.set(cacheKey, value);
        return value;
      }
    }

    const provider = this.providers[source];
    const file_format = provider.getFileFormat();
    const category = type.toString();
    const searchOrder = this.sizePriorities[size];

    let resolvedUrl: string | null = null;

    // check if requested file exists, search for fallback if it doesn't
    for (const targetSize of searchOrder) {
      const fileName = `${id}.${file_format}`;
      try {
        const fullPath = await join(appDataPath, category, targetSize.toString(), fileName);

        if (await exists(fullPath)) {
          resolvedUrl = convertFileSrc(fullPath);
          break;
        }
      } catch (err) {
        console.error(`Error resolving path for ${id} in ${targetSize}:`, err);
      }
    }

    // LRU - delete the oldest entry if needed
    if (this.pathCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.pathCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.pathCache.delete(oldestKey);
      }
    }

    this.pathCache.set(cacheKey, resolvedUrl);
    return resolvedUrl;
  }

  clearCache(id?: string) {
    if (id) {
      for (const key of this.pathCache.keys()) {
        if (key.startsWith(id)) this.pathCache.delete(key);
      }
    } else {
      this.pathCache.clear();
    }
  }

}
