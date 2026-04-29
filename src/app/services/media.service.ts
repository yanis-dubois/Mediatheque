import { inject, Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { LibraryMedia, ApiMedia, MediaStatus, MediaType, MediaSource, MediaPossessionStatus } from '@models/media.model';
import { EntityService } from './entity.service';
import { EntityType } from '@app/models/entity.model';
import { ImageService } from './image.service';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class MediaService {

  private entityService = inject(EntityService);
  private imageService = inject(ImageService);
  private settingsService = inject(SettingsService);

  updateCache(id: string, partial: Partial<LibraryMedia>) {
    this.entityService.updateEntity<LibraryMedia & { type: EntityType.MEDIA }>(
      EntityType.MEDIA, 
      id, 
      partial
    );
  }

  /* get media */

  async getById(id: string): Promise<LibraryMedia> {
    const media = await invoke<LibraryMedia>('get_media_by_id', { id });
    // load in cache
    this.entityService.setEntity({ ...media, type: EntityType.MEDIA });
    return media;
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

  async updatePossessionStatus(id: string, status: MediaPossessionStatus): Promise<void> {
    await invoke('update_media_possession_status', { id, status });
    this.updateCache(id, { possessionStatus: status } );
  }

  async updateNotes(id: string, notes: string): Promise<void> {
    await invoke('update_media_notes', { id, notes });
    this.updateCache(id, { notes: notes } );
  }

  async updateScore(id: string, score?: number): Promise<void> {
    await invoke('update_media_score', { id, score });
    this.updateCache(id, { score: score } );
  }

  async refreshMediaData(id: string, externalId: number, mediaType: MediaType, mediaSource: MediaSource): Promise<void> {
    this.entityService.removeEntity(EntityType.MEDIA, id);
    await invoke<void>('refresh_media_data_from_internet', { 
      id,
      externalId, 
      mediaType, 
      mediaSource,
      language: this.settingsService.language(),
    });
    this.entityService.getMedia(id, true);
  }

  /* add media */

  async addToLibrary(media: ApiMedia): Promise<string> {
    return await invoke<string>('add_media_to_library', { 
      apiMedia: media,
    });
  }

  /* delete media */

  async delete(id: string, externalId?: number) {
    await invoke('delete_media', { id, externalId: externalId });
    this.entityService.removeEntity(EntityType.MEDIA, id);
    this.entityService.update();
    this.imageService.clearCache(id);
  }
}
