import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Collection } from '@models/collection.model';

@Injectable({ providedIn: 'root' })
export class CollectionService {

  getById(id: string): Promise<Collection> {
    const pagination = { limit: 100, offset: 0 };
    return invoke('get_collection_by_id', { collectionId: id, pagination });
  }

  getAllIds(): Promise<string[]> {
    return invoke('get_all_collection_ids');
  }
}
