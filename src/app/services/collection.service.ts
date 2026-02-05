import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Collection } from '@models/collection.model';
import { CollectionQuery, CollectionQueryType } from '@models/collection-query.model';
import { MediaStatus, MediaType, enumToName } from '@models/media.model';
import { MediaFilter, MediaOrder, MediaOrderDirection, MediaOrderField, Pagination } from '@models/media-query.model';

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
      case CollectionQueryType.MEDIA_TYPE:
        return this.getByMediaType(query.mediaType);
      case CollectionQueryType.FAVORITE:
        return this.getFavorite();
      case CollectionQueryType.RECENT:
        return this.getRecent(query.limit);
      case CollectionQueryType.STATUS:
        return this.getByStatus(query.status);
    }
  }

  async getAll(): Promise<Collection> {
    const mediaList = await this.mediaService.getMediaList();

    return {
      name: 'All',
      mediaList
    };
  }

  async getFavorite(): Promise<Collection> {
    const queryFilter: MediaFilter = {
      favoriteOnly: true
    };
    const queryOrder: MediaOrder[] = [];

    const mediaList = await this.mediaService.getMediaList({
      filter: queryFilter, 
      order: queryOrder
    });

    return {
      name: 'Favorite',
      mediaList
    };
  }

  async getRecent(limit?: number): Promise<Collection> {
    const queryOrder: MediaOrder[] = [
      { field: MediaOrderField.ADDED_DATE, direction: MediaOrderDirection.DESC }
    ];

    const mediaList = await this.mediaService.getMediaList({
      order: queryOrder
    });

    return {
      name: 'Recent',
      mediaList
    };
  }

  async getByMediaType(mediaType: MediaType): Promise<Collection> {
    const queryFilter: MediaFilter = {
      mediaType: mediaType
    };

    const mediaList = await this.mediaService.getMediaList({
      filter: queryFilter
    });

    return {
      name: `${enumToName(mediaType)}`,
      mediaList
    };
  }

  async getByStatus(status: MediaStatus): Promise<Collection> {
    const queryFilter: MediaFilter = {
      status: status
    };

    const mediaList = await this.mediaService.getMediaList({
      filter: queryFilter
    });

    return {
      name: `${enumToName(status)}`,
      mediaList
    };
  }

  getById(id: number): Promise<Collection> {
    return invoke('get_collection_by_id', { id }); // TODO
  }
}
