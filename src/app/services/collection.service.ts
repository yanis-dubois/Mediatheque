import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Collection } from '@models/collection';
import { CollectionQuery, CollectionQueryType } from '@models/collectionQuery';
import { MediaStatus, enumToName } from '@models/media';

import { MediaService } from './media.service';

@Injectable({ providedIn: 'root' })
export class CollectionService {

  constructor(
    private mediaService: MediaService
  ) {}

  getCollection(query : CollectionQuery): Promise<Collection> {
    switch (query.type) {
      case CollectionQueryType.SIMPLE:
        return this.getById(query.id);
      case CollectionQueryType.ALL:
        return this.getAll();
      case CollectionQueryType.FAVORITE:
        return this.getFavorite();
      case CollectionQueryType.STATUS:
        return this.getByStatus(query.status);
      case CollectionQueryType.RECENT:
        throw new Error('RECENT not implemented');
    }
  }

  async getAll(): Promise<Collection> {
    const mediaList = await this.mediaService.getAll();

    return {
      name: 'All',
      mediaList
    };
  }

  async getFavorite(): Promise<Collection> {
    const mediaList = await this.mediaService.getFavorite();

    return {
      name: 'Favorite',
      mediaList
    };
  }

  async getByStatus(status: MediaStatus): Promise<Collection> {
    const mediaList = await this.mediaService.getByStatus(status);

    return {
      name: `${enumToName(status)}`,
      mediaList
    };
  }

  getById(id: number): Promise<Collection> {
    return invoke('get_collection_by_id', { id }); // TODO
  }
}
