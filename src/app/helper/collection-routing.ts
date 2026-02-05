import { CollectionQuery, CollectionQueryType } from '@models/collection-query.model';
import { enumToPath } from '@models/media.model';

export function collectionLink(query: CollectionQuery): any[] {
  switch (query.type) {
    case CollectionQueryType.ALL:
      return ['/collection', CollectionQueryType.ALL];

    case CollectionQueryType.SIMPLE:
      return ['/collection', CollectionQueryType.SIMPLE, query.id];

    case CollectionQueryType.FAVORITE:
      return ['/collection', CollectionQueryType.FAVORITE];

    case CollectionQueryType.RECENT:
      return ['/collection', CollectionQueryType.RECENT, 1];

    case CollectionQueryType.MEDIA_TYPE:
      return ['/collection', CollectionQueryType.MEDIA_TYPE, enumToPath(query.mediaType)];

    case CollectionQueryType.STATUS:
      return ['/collection', CollectionQueryType.STATUS, enumToPath(query.status)];
  }
}
