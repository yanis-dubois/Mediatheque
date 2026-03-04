import { Injectable, signal, WritableSignal } from "@angular/core";
import { DetailedEntity, EntityType } from "@app/models/entity.model";
import { MediaService } from "./media.service";
import { CollectionService } from "./collection.service";

@Injectable({ providedIn: 'root' })
export class EntityService {

  private readonly MAX_CACHE_SIZE = 500;
  // {key: Signal<DetailedEntity>}
  private entityCache = new Map<string, WritableSignal<DetailedEntity | null>>();
  private cacheOrder: string[] = [];

  constructor(
    private mediaService: MediaService,
    private collectionService: CollectionService,
    // private personService: PersonService,
  ) { }

  // key = type:id
  buildKey(type: EntityType, id: string): string {
    return `${type}:${id}`;
  }

  getEntitySignal(type: EntityType, id: string): WritableSignal<DetailedEntity | null> {
    const key = this.buildKey(type, id);
    if (!this.entityCache.has(key)) {
      this.entityCache.set(key, signal<DetailedEntity | null>(null));
    }
    return this.entityCache.get(key)!;
  }

  setEntity(entity: DetailedEntity) {
    const key = this.buildKey(entity.type, entity.id);
    this.getEntitySignal(entity.type, entity.id).set(entity);
    this.updateCacheOrder(key);
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
        const medias = await this.mediaService.getMediaBatch(ids);
        medias.forEach(m => this.setEntity({ ...m, type: EntityType.MEDIA }));
        break;
        
      case EntityType.COLLECTION:
        const collections = await this.collectionService.getCollectionBatch(ids);
        collections.forEach(c => this.setEntity({ ...c, type: EntityType.COLLECTION }));
        break;
  
      case EntityType.PERSON:
        // const persons = await invoke<Person[]>('get_person_batch', { ids });
        // persons.forEach(p => this.setEntity({ ...p, type: EntityType.PERSON }));
        break;
        
      // TODO
    }
  }

}
