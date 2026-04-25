import { Pipe, PipeTransform } from '@angular/core';
import { CollectionMediaType, CollectionType, isCollectionMediaType } from '@app/models/collection.model';
import { FiveStep, ThreeStep } from '@app/models/score.model';
import { MediaStatus, MediaType } from '@models/media.model';

@Pipe({
  name: 'emojize',
  standalone: true
})
export class EmojizePipe implements PipeTransform {

  transform(value: MediaType): string;
  transform(value: CollectionMediaType): string;
  transform(value: ThreeStep): string;
  transform(value: FiveStep): string;
  transform(value: any): string {

    // collection media type
    if (isCollectionMediaType(value)) {
      if (value.type === 'ALL') return "🗃️";
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
        case FiveStep.HATE: return "☹️";
        case FiveStep.UNDEFINED: return "";
      }
    }

    return "";
  }

}
