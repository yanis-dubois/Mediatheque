import { Injectable, signal, WritableSignal } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { ExternalMedia, Media, MediaStatus } from '@models/media.model';

@Injectable({ providedIn: 'root' })
export class MediaService {

  /* cache */

  private readonly MAX_CACHE_SIZE = 500;
  private mediaCache = new Map<string, WritableSignal<Media | null>>();
  private cacheOrder: string[] = [];
  lastUpdate = signal<number>(Date.now());

  getMediaSignal(id: string): WritableSignal<Media | null> {
    if (!this.mediaCache.has(id)) {
      this.mediaCache.set(id, signal<Media | null>(null));
    }

    return this.mediaCache.get(id)!;
  }

  setMedia(media: Media) {
    const s = this.getMediaSignal(media.id);
    s.set(media);
    this.updateCacheOrder(media.id);
  }

  private updateCacheOrder(id: string) {
    // delete id if exist to make it more recent
    this.cacheOrder = this.cacheOrder.filter(itemId => itemId !== id);
    this.cacheOrder.push(id);

    // cleaning if max size reached
    if (this.cacheOrder.length > this.MAX_CACHE_SIZE) {
      const oldestId = this.cacheOrder.shift();
      if (oldestId) {
        const s = this.mediaCache.get(oldestId);
        if (s) s.set(null); 
        this.mediaCache.delete(oldestId);
      }
    }
  }

  /* get media */

  getById(id: string): Promise<Media> {
    return invoke<any>('get_media_by_id', { id });
  }

  async getMediaBatch(ids: string[]): Promise<Media[]> {
    if (ids.length === 0) return [];
    return await invoke<Media[]>('get_media_batch', { ids });
  }

  /* update media */

  async toggleFavorite(id: string, isFavorite: boolean) {
    await invoke('toggle_media_favorite', { id, isFavorite });

    this.getMediaSignal(id).update(m => m ? { ...m, favorite: isFavorite } : null);
    this.lastUpdate.set(Date.now());
  }

  async updateStatus(id: string, status: MediaStatus): Promise<void> {
    await invoke('update_media_status', { id, status });

    this.getMediaSignal(id).update(m => m ? { ...m, status: status } : null);
    this.lastUpdate.set(Date.now());
  }

  updateNotes(id: string, notes: string): Promise<void> {
    return invoke('update_media_notes', { id, notes });
  }

  /* add media */

  addToLibrary(media: ExternalMedia): Promise<void> {
    return invoke('add_media_to_library', { data: media });
  }
}
