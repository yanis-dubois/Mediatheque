import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Collection, CollectionLayout, CollectionMediaType } from '@models/collection.model';
import { MediaFilter, MediaOrder } from '@models/media-query.model';
import { Media } from '@models/media.model';

@Injectable({ providedIn: 'root' })
export class CollectionService {

  // configuration
  private readonly MAX_CACHE_SIZE = 500;

  private mediaCache = new Map<string, Media>();

  clearCache() {
    this.mediaCache.clear();
  }

  getCachedMedia(id: string): Media | undefined {
    return this.mediaCache.get(id);
  }

  /* get */

  getInfo(id: string) {
    return invoke<Collection>('get_collection_by_id', { collectionId: id });
  }

  getLayoutData(id: string) {
    return invoke<[string, number, number][]>('get_collection_layout_data', { collectionId: id });
  }

  async getMediaBatch(ids: string[]): Promise<Media[]> {
    const toFetch = ids.filter(id => !this.mediaCache.has(id));

    if (toFetch.length > 0) {
      await this.fetchMissingMedia(toFetch);
    }

    return ids.map(id => {
      const media = this.mediaCache.get(id);
      if (media) {
        // delete & set to make it recent
        this.mediaCache.delete(id);
        this.mediaCache.set(id, media);
      }
      return media!;
    });
  }

  private async fetchMissingMedia(ids: string[]): Promise<void> {
    const newMedia = await invoke<Media[]>('get_media_batch', { mediaIds: ids });

    newMedia.forEach(m => {
      // if cache is full : delete oldest media
      if (this.mediaCache.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.mediaCache.keys().next().value;
        this.mediaCache.delete(firstKey);
      }
      this.mediaCache.set(m.id, m);
    });
  }

  searchMedia(query: string) {
    return invoke<[string, number, number][]>('search_layout_data', { query: query });
  }

  getAllIds(): Promise<string[]> {
    return invoke('get_all_collection_ids');
  }

  /* update */

  // generic 
  toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    return invoke('toggle_collection_favorite', { id, isFavorite });
  }

  updateName(id: string, name: string): Promise<void> {
    return invoke('update_collection_name', { id, name });
  }

  updateDescription(id: string, description: string): Promise<void> {
    return invoke('update_collection_description', { id, description });
  }

  updatePreferredLayout(id: string, layout: CollectionLayout): Promise<void> {
    return invoke('update_collection_preferred_layout', { id, layout });
  }

  updateSort(id: string, sort: MediaOrder[]) {
    return invoke('update_collection_sort', { id, sort });
  }

  updateMediaType(id: string, mediaType: CollectionMediaType) {
    return invoke('update_collection_media_type', { id, mediaType });
  }

  // dynamic
  updateFilter(id: string, filter: MediaFilter) {
    return invoke('update_collection_filter', { id, filter });
  }

  // manual
  addMediaBatch(id: string, mediaIds: Set<string>) {
    const mediaIdsArray = [...mediaIds];
    return invoke('add_media_batch_to_collection', { id, mediaIds: mediaIdsArray });
  }

  removeMedia(id: string, mediaId: string) {
    return invoke('remove_media_from_collection', { id, mediaId });
  }
}
