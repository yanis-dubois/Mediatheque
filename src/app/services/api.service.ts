import { Injectable } from '@angular/core';
import { ApiSearchResult } from '@app/models/api.model';
import { MediaType } from '@app/models/media.model';

import { invoke } from '@tauri-apps/api/core';

@Injectable({ providedIn: 'root' })
export class ApiService {

  async search(query: string, mediaType: MediaType): Promise<ApiSearchResult[]> {
    return await invoke<ApiSearchResult[]>('search_media_on_internet', { query, mediaType });
  }

  async addMedia(externalId: number, mediaType: MediaType): Promise<ApiSearchResult[]> {
    return await invoke<ApiSearchResult[]>('add_media_from_internet', { externalId, mediaType });
  }

}
