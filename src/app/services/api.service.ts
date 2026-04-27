import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { AnyApiMedia, ApiMedia, ApiSearchResult, MediaSource, MediaType } from '@app/models/media.model';

import { invoke } from '@tauri-apps/api/core';
import { SettingsService } from './settings.service';
import { ImageService } from './image.service';
import { ApiSearchResultCount } from '@app/models/media-query.model';

@Injectable({ providedIn: 'root' })
export class ApiService {

  settingsService = inject(SettingsService);
  imageService = inject(ImageService);

  private readonly MAX_CACHE_SIZE = 500;
  // {key: Signal<ApiMedia>}
  private apiCache = new Map<string, WritableSignal<AnyApiMedia | null>>();
  private cacheOrder: string[] = [];

  // key = source:id
  buildKey(mediaType: MediaType, source: MediaSource, id: string): string {
    return `${mediaType}:${source}:${id}`;
  }

  getSignal(mediaType: MediaType, source: MediaSource, id: string, forceLoad = false): WritableSignal<AnyApiMedia | null> {
    const key = this.buildKey(mediaType, source, id);
    if (!this.apiCache.has(key)) {
      this.apiCache.set(key, signal<AnyApiMedia | null>(null));
    }

    if (forceLoad) {
      this.getById(id, mediaType, source);
      this.updateCacheOrder(key);
    }

    return this.apiCache.get(key)!;
  }

  setEntity(apiMedia: AnyApiMedia) {
    const idStr = apiMedia.externalId.toString();
    const key = this.buildKey(apiMedia.mediaType, apiMedia.source, idStr);
    this.getSignal(apiMedia.mediaType, apiMedia.source, idStr).set(apiMedia);
    this.updateCacheOrder(key);
  }

  private updateCacheOrder(key: string) {
    // delete id if exist to make it more recent
    this.cacheOrder = this.cacheOrder.filter(itemId => itemId !== key);
    this.cacheOrder.push(key);

    // cleaning if max size reached
    if (this.cacheOrder.length > this.MAX_CACHE_SIZE) {
      const oldestId = this.cacheOrder.shift();
      if (oldestId) {
        const s = this.apiCache.get(oldestId);
        if (s) s.set(null); 
        this.apiCache.delete(oldestId);
      }
    }
  }

  /* get */

  async search(query: string, mediaType: MediaType, page: number): Promise<ApiSearchResultCount> {
    return await invoke<ApiSearchResultCount>('search_media_on_internet', { 
      query, 
      mediaType, 
      language: this.settingsService.language(),
      page 
    });
  }

  async getById(externalId: string, mediaType: MediaType, mediaSource: MediaSource): Promise<ApiMedia> {
    const idAsInt = parseInt(externalId, 10);
    if (isNaN(idAsInt)) {
      throw new Error(`Invalid externalId: ${externalId} is not a number`);
    }
    return await invoke<ApiMedia>('get_api_media_by_id', { 
      externalId: idAsInt, 
      mediaType,
      mediaSource, 
      language: this.settingsService.language() 
    });
  }

  /* add */

  async addMedia(externalId: number, mediaType: MediaType, mediaSource: MediaSource): Promise<string> {
    return await invoke<string>('add_media_from_internet', { 
      externalId, 
      mediaType, 
      mediaSource,
      language: this.settingsService.language(),
    });
  }

}
