import { inject, Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { LibraryMedia, ApiMedia, MediaStatus, MediaType } from '@models/media.model';
import { EntityService } from './entity.service';
import { EntityType } from '@app/models/entity.model';
import { Language } from '@app/models/settings.model';

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

  async getApiMediaById(externalId: string, mediaType: MediaType, language: Language): Promise<ApiMedia> {
    const idAsInt = parseInt(externalId, 10);
    if (isNaN(idAsInt)) {
      throw new Error(`Invalid externalId: ${externalId} is not a number`);
    }
    return await invoke<ApiMedia>('get_api_media_by_id', { externalId: idAsInt, mediaType, language });
  }

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
