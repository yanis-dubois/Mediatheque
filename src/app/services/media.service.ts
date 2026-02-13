import { Injectable, signal, WritableSignal } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { ExternalMedia, Media, MediaStatus } from '@models/media.model';
import { Movie, Series } from '@models/media-details.model';

@Injectable({ providedIn: 'root' })
export class MediaService {

  private mediaCache = new Map<string, WritableSignal<Media | null>>();
  lastUpdate = signal<number>(Date.now());

  getMediaSignal(id: string): WritableSignal<Media | null> {
    if (!this.mediaCache.has(id)) {
      this.mediaCache.set(id, signal<Media | null>(null));
    }

    return this.mediaCache.get(id)!;
  }

  /* get media */

  getById(id: string): Promise<Media | Movie | Series> {
    return invoke<any>('get_media_by_id', { id });
  }

  /* update media */

  async toggleFavorite(id: string, isFavorite: boolean) {
    await invoke('toggle_media_favorite', { id, isFavorite });

    const mediaSignal = this.getMediaSignal(id);
    mediaSignal.update(m => m ? { ...m, favorite: isFavorite } : null);
    this.lastUpdate.set(Date.now());
  }

  updateStatus(id: string, status: MediaStatus): Promise<void> {
    return invoke('update_media_status', { id, status });
  }

  updateNotes(id: string, notes: string): Promise<void> {
    return invoke('update_media_notes', { id, notes });
  }

  /* add media */

  addToLibrary(media: ExternalMedia): Promise<void> {
    return invoke('add_media_to_library', { data: media });
  }
}
