import { CollectionQuery, CollectionQueryType } from '@models/collectionQuery';
import { enumToPath } from '@models/media';

export function collectionLink(query: CollectionQuery): any[] {
  switch (query.type) {
    case CollectionQueryType.ALL:
      return ['/collection', 'all'];

    case CollectionQueryType.SIMPLE:
      return ['/collection', 'simple', query.id];

    case CollectionQueryType.FAVORITE:
      return ['/collection', 'favorite'];

    case CollectionQueryType.STATUS:
      return ['/collection', 'status', enumToPath(query.status)];

    case CollectionQueryType.RECENT:
      return ['/collection', 'recent'];

    default:
      throw new Error('Unknown CollectionQuery');
  }
}
