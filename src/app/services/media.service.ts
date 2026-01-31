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

  getByTag(tag: string): Promise<Media[]> {
    return invoke<Media[]>('get_media_by_tag', { tag });
  }

  getByStatus(status: MediaStatus): Promise<Media[]> {
    return invoke<Media[]>('get_media_by_status', { status });
  }
}
