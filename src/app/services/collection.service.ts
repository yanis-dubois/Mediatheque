import { inject, Injectable, signal, WritableSignal } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Collection, CollectionLayout, CollectionMediaType, ExternalCollection } from '@models/collection.model';
import { MediaFilter, MediaOrder, Pagination } from '@models/media-query.model';
import { PinService } from './pin.service';
import { EntityType } from '@app/models/entity.model';
import { EntityService } from './entity.service';

@Injectable({ providedIn: 'root' })
export class CollectionService {

  /* layout data cache */

  private readonly MAX_CACHE_SIZE = 100;
  // {id: Signal<layoutData>}
  private layoutDataCache = new Map<string, WritableSignal<[string, number, number][] | null>>();
  private cacheOrder: string[] = [];

  getLayoutDataSignal(id: string, forceLoad = false): WritableSignal<[string, number, number][] | null> {
    if (!this.layoutDataCache.has(id)) {
      this.layoutDataCache.set(id, signal<[string, number, number][] | null>(null));
    }

    return this.layoutDataCache.get(id)!;
  }

  setLayoutData(id: string, layoutData: [string, number, number][]) {
    this.getLayoutDataSignal(id).set(layoutData);
    this.updateCacheOrder(id);
  }

  private updateCacheOrder(id: string) {
    // delete id if exist to make it more recent
    this.cacheOrder = this.cacheOrder.filter(itemId => itemId !== id);
    this.cacheOrder.push(id);

    // cleaning if max size reached
    if (this.cacheOrder.length > this.MAX_CACHE_SIZE) {
      const oldestId = this.cacheOrder.shift();
      if (oldestId) {
        const s = this.layoutDataCache.get(oldestId);
        if (s) s.set(null); 
        this.layoutDataCache.delete(oldestId);
      }
    }
  }

  /* collection cache */

  private entityService = inject(EntityService);
  private pinService = inject(PinService);

  lastUpdate = signal<number>(Date.now());

  updateCache(id: string, partial: Partial<Collection>) {
    this.entityService.updateEntity<Collection & { type: EntityType.COLLECTION }>(
      EntityType.COLLECTION, 
      id, 
      partial
    );
  }

  /* get */

  getById(id: string) {
    return invoke<Collection>('get_collection_by_id', { collectionId: id });
  }

  getLayoutData(id: string, search: string, pagination: Pagination) {
    return invoke<[string, number, number][]>('search_in_collection', { collectionId: id, searchQuery: search, pagination });
  }

  searchCollection(search: string, context: CollectionMediaType, isCollectionPicker: boolean = false) {
    return invoke<string[]>('search_in_collections', { searchQuery: search, context, isCollectionPicker });
  }

  async getCollectionBatch(ids: string[]): Promise<Collection[]> {
    if (ids.length === 0) return [];
    return await invoke<Collection[]>('get_collection_batch', { ids });
  }

  searchMedia(query: string, mediaType: CollectionMediaType, pagination: Pagination) {
    return invoke<[string, number, number][]>('search_layout_data', { query: query, mediaType: mediaType, pagination });
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
    const mediaType = (this.entityService.getCollection(id))?.mediaType;
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
    if (newMediaType) {
      await this.pinService.removeIncompatiblePins(id, newMediaType);
      this.updateMediaType(id, newMediaType);
    }
  }

  // manual
  async addMediaBatchToCollection(id: string, mediaIds: Set<string>) {
    const mediaIdsArray = [...mediaIds];
    await invoke('add_media_batch_to_collection', { id, mediaIds: mediaIdsArray });
    this.entityService.update();
  }

  async addMediaToCollectionBatch(mediaId: string, collectionIds: Set<string>) {
    const collectionIdsArray = [...collectionIds];
    await invoke('add_media_to_collection_batch', { mediaId, collectionIds: collectionIdsArray });
    this.entityService.update();
  }

  async removeMedia(id: string, mediaId: string) {
    await invoke('remove_media_from_collection', { id, mediaId });
  }

  /* create */

  createCollection(collection: ExternalCollection): Promise<string> {
    return invoke('create_collection', { data: collection });
  }

  /* delete */

  async delete(id: string) {
    await invoke('delete_collection', { id });
    this.entityService.removeEntity(EntityType.COLLECTION, id);
    this.pinService.removePinFromCache(id);

    this.entityService.update();
  }
}
