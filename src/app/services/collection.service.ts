import { Injectable, signal, WritableSignal } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Collection, CollectionLayout, CollectionMediaType } from '@models/collection.model';
import { MediaFilter, MediaOrder } from '@models/media-query.model';

@Injectable({ providedIn: 'root' })
export class CollectionService {

  /* cache */

  private readonly MAX_CACHE_SIZE = 500;
  private collectionCache = new Map<string, WritableSignal<Collection | null>>();
  private cacheOrder: string[] = [];
  lastUpdate = signal<number>(Date.now());

  getCollectionSignal(id: string): WritableSignal<Collection | null> {
    if (!this.collectionCache.has(id)) {
      this.collectionCache.set(id, signal<Collection | null>(null));
      // TODO: call get_by_id ??
    }

    return this.collectionCache.get(id)!;
  }

  setCollection(collection: Collection) {
    const s = this.getCollectionSignal(collection.id);
    s.set(collection);
    this.updateCacheOrder(collection.id);
  }

  private updateCacheOrder(id: string) {
    // delete id if exist to make it more recent
    this.cacheOrder = this.cacheOrder.filter(itemId => itemId !== id);
    this.cacheOrder.push(id);

    // cleaning if max size reached
    if (this.cacheOrder.length > this.MAX_CACHE_SIZE) {
      const oldestId = this.cacheOrder.shift();
      if (oldestId) {
        const s = this.collectionCache.get(oldestId);
        if (s) s.set(null); 
        this.collectionCache.delete(oldestId);
      }
    }
  }

  /* get */

  getInfo(id: string) {
    return invoke<Collection>('get_collection_by_id', { collectionId: id });
  }

  getLayoutData(id: string, search: string) {
    return invoke<[string, number, number][]>('search_in_collection', { collectionId: id, searchQuery: search });
  }

  getCollectionsIds(search: string) {
    return invoke<string[]>('search_in_collections', { searchQuery: search });
  }

  async getCollectionBatch(ids: string[]): Promise<Collection[]> {
    if (ids.length === 0) return [];
    return await invoke<Collection[]>('get_collection_batch', { ids });
  }

  searchMedia(query: string, mediaType: CollectionMediaType) {
    return invoke<[string, number, number][]>('search_layout_data', { query: query, mediaType: mediaType });
  }

  getAllIds(): Promise<string[]> {
    return invoke('get_all_collection_ids');
  }

  /* update */

  updateCache(id: string, partial: Partial<Collection>) {
    this.getCollectionSignal(id).update(c => c ? { ...c, ...partial } : null);
    this.lastUpdate.set(Date.now());
  }

  // generic 
  async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    await invoke('toggle_collection_favorite', { id, isFavorite });
    this.updateCache(id, { favorite: isFavorite });
  }

  async updateName(id: string, name: string): Promise<void> {
    await invoke('update_collection_name', { id, name });
    this.updateCache(id, { name: name });
  }

  async updateDescription(id: string, description: string): Promise<void> {
    await invoke('update_collection_description', { id, description });
    this.updateCache(id, { description: description });
  }

  async updatePreferredLayout(id: string, layout: CollectionLayout): Promise<void> {
    await invoke('update_collection_preferred_layout', { id, layout });
    this.updateCache(id, { preferredLayout: layout });
  }

  async updateMediaType(id: string, mediaType: CollectionMediaType) {
    await invoke('update_collection_media_type', { id, mediaType });
    this.updateCache(id, { mediaType: mediaType });
  }

  async updateSort(id: string, sort: MediaOrder[]) {
    await invoke('update_collection_sort', { id, sort });
    this.updateCache(id, { sortOrder: sort });
  }

  // dynamic
  async updateFilter(id: string, filter: MediaFilter) {
    await invoke('update_collection_filter', { id, filter });
    this.updateCache(id, { filter: filter });

    // determine new media type
    let newMediaType: CollectionMediaType | undefined = undefined;
    const mediaType = this.getCollectionSignal(id)()?.mediaType;
    if (filter.mediaType && mediaType?.type == "ALL") {
      newMediaType = { type: "SPECIFIC", value: filter.mediaType };
    }
    else if (filter.mediaType && mediaType?.type == "SPECIFIC" && filter.mediaType !== mediaType.value) {
      newMediaType = { type: "SPECIFIC", value: filter.mediaType };
    }
    else if (!filter.mediaType && mediaType?.type == "SPECIFIC") {
      newMediaType = { type: "ALL" };
    }

    // apply it
    if (newMediaType) this.updateMediaType(id, newMediaType);
  }

  // manual
  addMediaBatch(id: string, mediaIds: Set<string>) {
    const mediaIdsArray = [...mediaIds];
    return invoke('add_media_batch_to_collection', { id, mediaIds: mediaIdsArray });
  }

  removeMedia(id: string, mediaId: string) {
    return invoke('remove_media_from_collection', { id, mediaId });
  }

  /* delete */

  async delete(id: string) {
    await invoke('delete_collection', { id });

    // empty the signal
    const s = this.collectionCache.get(id);
    if (s) s.set(null);

    // delete from cache
    this.collectionCache.delete(id);
    this.cacheOrder = this.cacheOrder.filter(itemId => itemId !== id);

    // update
    this.lastUpdate.set(Date.now());
  }
}
