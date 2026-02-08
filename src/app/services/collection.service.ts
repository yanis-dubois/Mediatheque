import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Collection, CollectionLayout } from '@models/collection.model';
import { MediaOrder } from '@models/media-query.model';

@Injectable({ providedIn: 'root' })
export class CollectionService {

  /* get collection */

  getById(id: string): Promise<Collection> {
    const pagination = { limit: 100, offset: 0 };
    return invoke('get_collection_by_id', { collectionId: id, pagination });
  }

  getAllIds(): Promise<string[]> {
    return invoke('get_all_collection_ids');
  }

  /* update collection */

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

  updateSortOrder(id: string, sort: MediaOrder[]) {
    return invoke('update_collection_sort', { id, sort });
  }
}
