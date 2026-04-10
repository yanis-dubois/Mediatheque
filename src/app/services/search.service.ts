import { inject, Injectable, signal } from '@angular/core';
import { CollectionMediaType } from '@app/models/collection.model';

import { EntityType } from '@app/models/entity.model';
import { ApiSearchResult } from '@app/models/media.model';
import { EntityService } from './entity.service';

@Injectable({ providedIn: 'root' })
export class SearchService {

  private entityService = inject(EntityService);

  searchMode = signal<'library' | 'api'>('api');
  mediaType = signal<CollectionMediaType>({type: 'ALL'});

  searchQuery = signal<string>('');
  librarySearchQuery = signal<string>('');
  apiSearchQuery = signal<string>('');
  libraryResults = signal<[string, EntityType][]>([]);
  apiResults = signal<ApiSearchResult[]>([]);

  librarySearchPage = signal<number>(1);
  apiSearchPage = signal<number>(1);
  libraryCanLoadMore = signal<boolean>(true);
  apiCanLoadMore = signal<boolean>(true);

  constructor() {
    this.entityService.mediaInserted$.subscribe((media) => {
      this.syncApiResults(media.externalId, media.id, true);
    });

    this.entityService.mediaDeleted$.subscribe((externalId) => {
      this.syncApiResults(externalId, undefined, false);
    });
  }

  private syncApiResults(externalId: number | undefined, internalId: string | undefined, isInLibrary: boolean) {
    if (!externalId) return;

    this.apiResults.update(items => 
      items.map(item => {
        if (item && item.externalId.toString() === externalId.toString()) {
          return { ...item, id: internalId, isInLibrary };
        }
        return item;
      })
    );
  }

}
