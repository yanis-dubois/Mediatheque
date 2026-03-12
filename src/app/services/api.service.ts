import { inject, Injectable } from '@angular/core';
import { ApiSearchResult, MediaType } from '@app/models/media.model';

import { invoke } from '@tauri-apps/api/core';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class ApiService {

  settingsService = inject(SettingsService);

  async search(query: string, mediaType: MediaType): Promise<ApiSearchResult[]> {
    return await invoke<ApiSearchResult[]>('search_media_on_internet', { 
      query, mediaType, language: this.settingsService.language() 
    });
  }

  async addMedia(externalId: number, mediaType: MediaType): Promise<ApiSearchResult[]> {
    return await invoke<ApiSearchResult[]>('add_media_from_internet', { 
      externalId, mediaType, language: this.settingsService.language() 
    });
  }

}
