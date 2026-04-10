import { inject, Injectable, Injector, signal, WritableSignal } from "@angular/core";

import { listen } from '@tauri-apps/api/event';

import { Company, DetailedEntity, EntityType, Person, Tag } from "@app/models/entity.model";
import { MediaService } from "./media.service";
import { CollectionService } from "./collection.service";
import { invoke } from "@tauri-apps/api/core";
import { Collection, CollectionMediaType } from "@app/models/collection.model";
import { LibraryMedia } from "@app/models/media.model";
import { MetadataService } from "./metadata.service";
import { Subject } from "rxjs";
import { Pagination } from "@app/models/media-query.model";

@Injectable({ providedIn: 'root' })
export class EntityService {

  constructor() {
    this.setupTauriListeners();
  }

  private mediaInsertedSource = new Subject<LibraryMedia>();
  mediaInserted$ = this.mediaInsertedSource.asObservable();

  private mediaDeletedSource = new Subject<number>();
  mediaDeleted$ = this.mediaDeletedSource.asObservable();

  private async setupTauriListeners() {
    await listen<{ id: string }>('media-inserted', async (event) => {
      const newId = event.payload.id;

      // load in cache
      await this.loadById(EntityType.MEDIA, newId);
      // load from cache
      const media = this.getMedia(newId);
      // send to subcribers
      if (media) {
        this.mediaInsertedSource.next(media);
      }
    });

    await listen<{ externalId: number }>('media-deleted', async (event) => {
      const externalId = event.payload.externalId;

      this.mediaDeletedSource.next(externalId);
    });
  }

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

  getMedia(id: string, forceLoad = false): LibraryMedia | null {
    return this.getEntitySignal(EntityType.MEDIA, id, forceLoad)() as LibraryMedia | null; 
  }
  getCollection(id: string, forceLoad = false): Collection | null {
    return this.getEntitySignal(EntityType.COLLECTION, id, forceLoad)() as Collection | null; 
  }
  getPerson(id: string, forceLoad = false): Person | null {
    return this.getEntitySignal(EntityType.COLLECTION, id, forceLoad)() as Person | null; 
  }
  getCompany(id: string, forceLoad = false): Company | null {
    return this.getEntitySignal(EntityType.COLLECTION, id, forceLoad)() as Company | null; 
  }
  getGenre(id: string, forceLoad = false): Tag | null {
    return this.getEntitySignal(EntityType.COLLECTION, id, forceLoad)() as Tag | null; 
  }
  getGameMechanic(id: string, forceLoad = false): Tag | null {
    return this.getEntitySignal(EntityType.COLLECTION, id, forceLoad)() as Tag | null; 
  }

  getEntitySignal(type: EntityType, id: string, forceLoad = false): WritableSignal<DetailedEntity | null> {
    const key = this.buildKey(type, id);
    if (!this.entityCache.has(key)) {
      this.entityCache.set(key, signal<DetailedEntity | null>(null));
    }

    if (forceLoad) {
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
    const metadataService = this.injector.get(MetadataService);

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
        const persons = await metadataService.getPersonBatch(ids);
        persons.forEach(p => this.setEntity({ ...p, type: EntityType.PERSON }));
        break;
      case EntityType.COMPANY:
        const companies = await metadataService.getCompanyBatch(ids);
        companies.forEach(c => this.setEntity({ ...c, type: EntityType.COMPANY }));
        break;
      case EntityType.SAGA:
        const sagas = await metadataService.getSagaBatch(ids);
        sagas.forEach(s => this.setEntity({ ...s, type: EntityType.SAGA }));
        break;
      case EntityType.GENRE:
        const genre = await metadataService.getGenreBatch(ids);
        genre.forEach(g => this.setEntity({ ...g, type: EntityType.GENRE }));
        break;
      case EntityType.GAME_MECHANIC:
        const mechanics = await metadataService.getGameMechanicBatch(ids);
        mechanics.forEach(m => this.setEntity({ ...m, type: EntityType.GAME_MECHANIC }));
        break;
    }
  }

  async loadById(type: EntityType, id: string): Promise<void> {
    const metadataService = this.injector.get(MetadataService);

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
        const person = await metadataService.getPersonById(id);
        this.setEntity({ ...person, type: EntityType.PERSON });
        break;
      case EntityType.COMPANY:
        const company = await metadataService.getCompanyById(id);
        this.setEntity({ ...company, type: EntityType.COMPANY });
        break;
      case EntityType.SAGA:
        const saga = await metadataService.getSagaById(id);
        this.setEntity({ ...saga, type: EntityType.SAGA });
        break;
      case EntityType.GENRE:
        const genre = await metadataService.getGenreById(id);
        this.setEntity({ ...genre, type: EntityType.GENRE });
        break;
      case EntityType.GAME_MECHANIC:
        const mechanic = await metadataService.getGameMechanicById(id);
        this.setEntity({ ...mechanic, type: EntityType.GAME_MECHANIC });
        break;
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

  getLayoutData(search: string, context: CollectionMediaType, pagination: Pagination) {
    return invoke<[string, EntityType][]>('search_in_library', { 
      searchQuery: search, 
      context: context.type === "ALL" ? null : context.value,
      pagination
    });
  }

}
