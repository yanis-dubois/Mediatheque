import { Pipe, PipeTransform } from '@angular/core';
import { CollectionMediaType, CollectionType, isCollectionMediaType } from '@app/models/collection.model';
import { FiveStep, ThreeStep } from '@app/models/score.model';
import { MediaStatus, MediaType } from '@models/media.model';

@Pipe({
  name: 'emojize',
  standalone: true
})
export class EmojizePipe implements PipeTransform {

  transform(value: boolean): string;
  transform(value: MediaStatus): string;
  transform(value: MediaType): string;
  transform(value: CollectionMediaType): string;
  transform(value: CollectionType): string;
  transform(value: ThreeStep): string;
  transform(value: FiveStep): string;
  transform(value: any): string {
    // is favorite
    if (typeof value === 'boolean') {
      return value ? "❤️" : "🩶";
    }

    // status
    if (Object.values(MediaStatus).includes(value)) {
      switch (value) {
        case MediaStatus.FINISHED: return "✅";
        case MediaStatus.IN_PROGRESS: return "⏳";
        case MediaStatus.TO_DISCOVER: return "🔖";
        case MediaStatus.DROPPED: return "❌";
      }
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

    // three step
    if (Object.values(ThreeStep).includes(value)) {
      switch (value) {
        case ThreeStep.LOVE: return "🥰";
        case ThreeStep.LIKE: return "👍";
        case ThreeStep.DISLIKE: return "👎";
        case ThreeStep.UNDEFINED: return "";
      }
    }

    // five step
    if (Object.values(FiveStep).includes(value)) {
      switch (value) {
        case FiveStep.LOVE: return "🥰";
        case FiveStep.LIKE: return "😊"; // unused because match before ↑
        case FiveStep.NEUTRAL: return "😐";
        case FiveStep.DISLIKE: return "😕"; // unused because match before ↑
        case FiveStep.HATE: return "💩";
        case FiveStep.UNDEFINED: return "";
      }
    }

    return "";
  }

}
