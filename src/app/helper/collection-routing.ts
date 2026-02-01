import { CollectionQuery, CollectionQueryType } from '@models/collectionQuery';

export function collectionLink(query: CollectionQuery): any[] {
  switch (query.type) {
    case CollectionQueryType.ALL:
      return ['/collection', 'all'];

    case CollectionQueryType.SIMPLE:
      return ['/collection', 'simple', query.id];

    case CollectionQueryType.FAVORITES:
      return ['/collection', 'favorites'];

    case CollectionQueryType.STATUS:
      return ['/collection', 'status', query.status];

    case CollectionQueryType.RECENT:
      return ['/collection', 'recent'];

    default:
      throw new Error('Unknown CollectionQuery');
  }
}
