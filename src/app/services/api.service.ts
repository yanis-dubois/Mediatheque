import { inject, Injectable, WritableSignal } from '@angular/core';
import { ApiMedia, ApiSearchResult, MediaType } from '@app/models/media.model';

import { invoke } from '@tauri-apps/api/core';
import { SettingsService } from './settings.service';
import { ImageService } from './image.service';

@Injectable({ providedIn: 'root' })
export class ApiService {

  settingsService = inject(SettingsService);
  imageService = inject(ImageService);

  private readonly MAX_CACHE_SIZE = 500;
  // {key: Signal<ApiMedia>}
  private apiCache = new Map<string, WritableSignal<ApiMedia | null>>();
  private cacheOrder: string[] = [];

  // key = type:id
  buildKey(type: MediaSource, id: string): string {
    return `${type}:${id}`;
  }

  async search(query: string, mediaType: MediaType): Promise<ApiSearchResult[]> {
    return await invoke<ApiSearchResult[]>('search_media_on_internet', { 
      query, mediaType, language: this.settingsService.language() 
    });
  }

  async addMedia(externalId: number, mediaType: MediaType): Promise<string> {
    return await invoke<string>('add_media_from_internet', { 
      externalId, 
      mediaType, 
      language: this.settingsService.language(),
    });
  }

}
