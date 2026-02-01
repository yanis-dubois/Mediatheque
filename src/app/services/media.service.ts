import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Media, MediaStatus } from '@models/media';

@Injectable({ providedIn: 'root' })
export class MediaService {

  getById(id: number): Promise<Media> {
    return invoke('get_media_by_id', { id });
  }

  getAll(): Promise<Media[]> {
    return invoke<Media[]>('get_all_media');
  }

  getFavorite(): Promise<Media[]> {
    return invoke<Media[]>('get_favorite_media');
  }

  getByStatus(status: MediaStatus): Promise<Media[]> {
    return invoke<Media[]>('get_media_by_status', { status });
  }
}
