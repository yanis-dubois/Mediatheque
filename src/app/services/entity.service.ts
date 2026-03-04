import { inject, Injectable, Injector, signal, WritableSignal } from "@angular/core";
import { DetailedEntity, EntityType } from "@app/models/entity.model";
import { MediaService } from "./media.service";
import { CollectionService } from "./collection.service";
import { invoke } from "@tauri-apps/api/core";
import { Collection } from "@app/models/collection.model";
import { Media } from "@app/models/media.model";

@Injectable({ providedIn: 'root' })
export class EntityService {

  private injector = inject(Injector);

  private readonly MAX_CACHE_SIZE = 500;
  // {key: Signal<DetailedEntity>}
  private entityCache = new Map<string, WritableSignal<DetailedEntity | null>>();
  private cacheOrder: string[] = [];
  lastUpdate = signal<number>(Date.now());

  update() {
    this.lastUpdate.set(Date.now());
  }

  // key = type:id
  buildKey(type: EntityType, id: string): string {
    return `${type}:${id}`;
  }

  getMedia(id: string, forceLoad = false): Media | null {
    return this.getEntitySignal(EntityType.MEDIA, id, forceLoad)() as Media | null; 
  }
  getCollection(id: string, forceLoad = false): Collection | null {
    return this.getEntitySignal(EntityType.COLLECTION, id, forceLoad)() as Collection | null; 
  }

  getEntitySignal(type: EntityType, id: string, forceLoad = false): WritableSignal<DetailedEntity | null> {
    const key = this.buildKey(type, id);
    if (!this.entityCache.has(key)) {
      this.entityCache.set(key, signal<DetailedEntity | null>(null));
    }

    if (forceLoad && (this.entityCache.get(key)!() === null)) {
      this.loadById(type, id);
      this.updateCacheOrder(key);
    }

    return this.entityCache.get(key)!;
  }

  setEntity(entity: DetailedEntity) {
    const key = this.buildKey(entity.type, entity.id);
    this.getEntitySignal(entity.type, entity.id).set(entity);
    this.updateCacheOrder(key);
  }

  updateEntity<T extends DetailedEntity>(
    type: EntityType, 
    id: string, 
    partial: Partial<T>
  ) {
    this.getEntitySignal(type, id).update(current => {
      if (!current) return null;
      return { ...current, ...partial } as T;
    });

    this.update();
  }

  private updateCacheOrder(key: string) {
    // delete id if exist to make it more recent
    this.cacheOrder = this.cacheOrder.filter(itemId => itemId !== key);
    this.cacheOrder.push(key);

    // cleaning if max size reached
    if (this.cacheOrder.length > this.MAX_CACHE_SIZE) {
      const oldestId = this.cacheOrder.shift();
      if (oldestId) {
        const s = this.entityCache.get(oldestId);
        if (s) s.set(null); 
        this.entityCache.delete(oldestId);
      }
    }
  }

  async loadBatch(type: EntityType, ids: string[]): Promise<void> {
    switch (type) {
      case EntityType.MEDIA:
        const mediaService = this.injector.get(MediaService);
        const medias = await mediaService.getMediaBatch(ids);
        medias.forEach(m => this.setEntity({ ...m, type: EntityType.MEDIA }));
        break;
      case EntityType.COLLECTION:
        const collectionService = this.injector.get(CollectionService);
        const collections = await collectionService.getCollectionBatch(ids);
        collections.forEach(c => this.setEntity({ ...c, type: EntityType.COLLECTION }));
        break;
      case EntityType.PERSON:
        // const persons = await invoke<Person[]>('get_person_batch', { ids });
        // persons.forEach(p => this.setEntity({ ...p, type: EntityType.PERSON }));
        break;
      // TODO
    }
  }

  async loadById(type: EntityType, id: string): Promise<void> {
    switch (type) {
      case EntityType.MEDIA:
        const mediaService = this.injector.get(MediaService);
        const media = await mediaService.getById(id);
        this.setEntity({ ...media, type: EntityType.MEDIA });
        break;
      case EntityType.COLLECTION:
        const collectionService = this.injector.get(CollectionService);
        const collection = await collectionService.getById(id);
        this.setEntity({ ...collection, type: EntityType.COLLECTION });
        break;
      case EntityType.PERSON:
        // TODO
        break;
      // TODO
    }
  }

  removeEntity(type: EntityType, id: string) {
    const key = this.buildKey(type, id);

    // empty the signal
    const s = this.entityCache.get(key);
    if (s) s.set(null);

    // delete from cache
    this.entityCache.delete(key);
    this.cacheOrder = this.cacheOrder.filter(itemKey => itemKey !== key);
  }

  /* get */

  getLayoutData(search: string) {
    return invoke<[string, EntityType][]>('search_in_library', { searchQuery: search });
  }

}
