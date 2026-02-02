import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Media, MediaStatus } from '@models/media';
import { Movie, Series } from '@models/mediaDetails';

@Injectable({ providedIn: 'root' })
export class MediaService {

  getById(id: number): Promise<Media | Movie | Series> {
    return invoke<any>('get_media_by_id', { id });
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

  toggleFavorite(id: number, isFavorite: boolean): Promise<void> {
    return invoke('toggle_media_favorite', { id, isFavorite });
  }

  updateStatus(id: number, status: MediaStatus): Promise<void> {
    return invoke('update_media_status', { id, status });
  }

  updateNotes(id: number, notes: string): Promise<void> {
    return invoke('update_media_notes', { id, notes });
  }
}
