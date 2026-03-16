import { inject, Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { LibraryMedia, ApiMedia, MediaStatus, MediaType } from '@models/media.model';
import { EntityService } from './entity.service';
import { EntityType } from '@app/models/entity.model';
import { Language } from '@app/models/settings.model';
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

  async getApiMediaById(externalId: string, mediaType: MediaType, language: Language): Promise<ApiMedia> {
    const idAsInt = parseInt(externalId, 10);
    if (isNaN(idAsInt)) {
      throw new Error(`Invalid externalId: ${externalId} is not a number`);
    }
    return await invoke<ApiMedia>('get_api_media_by_id', { externalId: idAsInt, mediaType, language });
  }

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

  async updateNotes(id: string, notes: string): Promise<void> {
    await invoke('update_media_notes', { id, notes });
    this.updateCache(id, { notes: notes } );
  }

  async updateScore(id: string, score?: number): Promise<void> {
    await invoke('update_media_score', { id, score });
    this.updateCache(id, { score: score } );
  }

  async refreshMediaData(id: string, externalId: number, mediaType: MediaType): Promise<void> {
    this.entityService.removeEntity(EntityType.MEDIA, id);
    await invoke<void>('refresh_media_data_from_internet', { 
      id,
      externalId, 
      mediaType, 
      language: this.settingsService.language(),
      baseUrl: this.imageService.getOriginalUrl(mediaType)
    });
    this.entityService.getMedia(id, true);
  }

  /* add media */

  async addToLibrary(media: ApiMedia): Promise<string> {
    return await invoke<string>('add_media_to_library', { 
      apiMedia: media, baseUrl: this.imageService.getOriginalUrl(media.mediaType) 
    });
  }

  /* delete media */

  async delete(id: string) {
    await invoke('delete_media', { id });
    this.entityService.removeEntity(EntityType.MEDIA, id);
    this.entityService.update();
  }
}
