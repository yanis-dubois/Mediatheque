import { inject, Injectable } from "@angular/core";
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';

import { join } from "@tauri-apps/api/path";
import { exists } from '@tauri-apps/plugin-fs';

import { FileService } from "./file.services";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { get_image_size_file_name, get_image_type_file_name, ImageConfiguration, ImageSize, ImageType } from "@app/models/image.model";
import { map } from "rxjs";
import { MediaSource, MediaType } from "@app/models/media.model";

@Injectable({ providedIn: 'root' })
export class ImageService {

  private breakpointObserver = inject(BreakpointObserver);
  private fileService = inject(FileService);

  // all provider config necessary to build image url
  private configs: Record<string, ImageConfiguration> | null = null;

  async loadConfigs() {
    try {
      this.configs = await invoke<Record<string, ImageConfiguration>>('get_image_configurations');
      console.log('Image Configs loaded:', this.configs);
    } catch (err) {
      console.error('Failed to load image configs', err);
    }
  }

  getConfigKey(mediaType: MediaType, source: MediaSource): string {
    return `${mediaType}_${source}`; 
  }

  // cache that memorize image path
  private readonly MAX_CACHE_SIZE = 500;
  private pathCache = new Map<string, string | null>();

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

  resolveExternalUrl(path: string | undefined, mediaType: MediaType, source: MediaSource, type: ImageType, size: ImageSize): string {
    if (!this.configs || !path) return '';

    const config = this.configs[this.getConfigKey(mediaType, source)];
    if (!config) return '';

    return `${config.baseUrl}/${config.sizes[type][size]}/${path}.${config.format}`;
  }

  async resolveLocalUrl(id: string, mediaType: MediaType, source: MediaSource, type: ImageType, size: ImageSize): Promise<string | null> {
    const appDataPath = this.fileService.appDataPath();
    if (!appDataPath || !this.configs) return null;

    const cacheKey = `${id}-${type}-${size}`;
    if (this.pathCache.has(cacheKey)) {
      const value = this.pathCache.get(cacheKey)!;
      if (value) {
        this.pathCache.delete(cacheKey);
        this.pathCache.set(cacheKey, value);
        return value;
      }
    }

    const config = this.configs[this.getConfigKey(mediaType, source)];
    const file_format = config ? config.format : 'jpg';
    const category = get_image_type_file_name(type);
    const searchOrder = this.sizePriorities[size];

    let resolvedUrl: string | null = null;

    // check if requested file exists, search for fallback if it doesn't
    for (const targetSize of searchOrder) {
      const fileName = `${id}.${file_format}`;
      try {
        const fullPath = await join(appDataPath, category, get_image_size_file_name(targetSize), fileName);

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
