import { Pipe, PipeTransform } from '@angular/core';
import { CollectionMediaType, CollectionType, isCollectionMediaType } from '@app/models/collection.model';
import { MediaType } from '@models/media.model';

@Pipe({
  name: 'emojize',
  standalone: true
})
export class EmojizePipe implements PipeTransform {

  transform(value: boolean): string;
  transform(value: MediaType): string;
  transform(value: CollectionMediaType): string;
  transform(value: CollectionType): string;
  transform(value: any): string {
    // is favorite
    if (typeof value === 'boolean') {
      return value ? "❤️" : "🩶";
    }

    // collection media type
    if (isCollectionMediaType(value)) {
      if (value.type === 'ALL') return "🏠";
      return this.transform(value.value); // recursif call on MediaType
    }

    // media type
    if (Object.values(MediaType).includes(value)) {
      switch (value) {
        case MediaType.BOOK: return "📚";
        case MediaType.MOVIE: return "🎬";
        case MediaType.SERIES: return "📺";
        case MediaType.TABLETOP_GAME: return "🎲";
        case MediaType.VIDEO_GAME: return "🎮";
      }
    }

    // collection type
    if (Object.values(CollectionType).includes(value)) {
      switch (value) {
        case CollectionType.SYSTEM: return "⚙️";
        case CollectionType.DYNAMIC: return "🎛️";
        case CollectionType.MANUAL: return "🗂️";
      }
    }

    return "";
  }

}
