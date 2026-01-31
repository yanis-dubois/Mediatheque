import { CollectionQuery, CollectionQueryType } from '@models/collectionQuery';

export function collectionLink(query: CollectionQuery): any[] {
  switch (query.type) {
    case CollectionQueryType.ALL:
      return ['/collection', 'all'];

    case CollectionQueryType.SIMPLE:
      return ['/collection', 'simple', query.id];

    case CollectionQueryType.TAG:
      return ['/collection', 'tag', query.tag];

    case CollectionQueryType.FAVORITES:
      return ['/collection', 'favorites'];

    case CollectionQueryType.STATUS:
      return ['/collection', 'status', query.status];

    default:
      throw new Error('Unknown CollectionQuery');
  }
}
