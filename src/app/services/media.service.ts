import { inject, Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { LibraryMedia, ApiMedia, MediaStatus } from '@models/media.model';
import { EntityService } from './entity.service';
import { EntityType } from '@app/models/entity.model';

@Injectable({ providedIn: 'root' })
export class MediaService {

  private entityService = inject(EntityService);

  updateCache(id: string, partial: Partial<LibraryMedia>) {
    this.entityService.updateEntity<LibraryMedia & { type: EntityType.MEDIA }>(
      EntityType.MEDIA, 
      id, 
      partial
    );

    // On garde le lastUpdate pour la réactivité de l'écran de recherche
    // this.lastUpdate.set(Date.now());
  }

  /* get media */

  async getById(id: string): Promise<LibraryMedia> {
    return await invoke<LibraryMedia>('get_media_by_id', { id });
  }

  async getMediaBatch(ids: string[]): Promise<LibraryMedia[]> {
    if (ids.length === 0) return [];
    return await invoke<LibraryMedia[]>('get_media_batch', { ids });
  }

  /* update media */

  async toggleFavorite(id: string, isFavorite: boolean) {
    await invoke('toggle_media_favorite', { id, isFavorite });
    this.updateCache(id, { favorite: isFavorite } );
  }

  async updateStatus(id: string, status: MediaStatus): Promise<void> {
    await invoke('update_media_status', { id, status });
    this.updateCache(id, { status: status } );
  }

  async updateNotes(id: string, notes: string): Promise<void> {
    await invoke('update_media_notes', { id, notes });
    this.updateCache(id, { notes: notes } );
  }

  async updateScore(id: string, score?: number): Promise<void> {
    await invoke('update_media_score', { id, score });
    this.updateCache(id, { score: score } );
  }

  /* add media */

  addToLibrary(media: ApiMedia): Promise<void> {
    return invoke('add_media_to_library', { data: media });
  }
}
