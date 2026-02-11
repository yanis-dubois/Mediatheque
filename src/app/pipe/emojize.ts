import { Pipe, PipeTransform } from '@angular/core';
import { MediaType } from '@models/media.model';

@Pipe({
  name: 'emojize',
  standalone: true
})
export class EmojizePipe implements PipeTransform {

  transform(value: MediaType): string;
  transform(value: boolean): string;
  transform(value: any): string;

  transform(value: MediaType | boolean | any): string {
    // is favorite
    if (typeof value === 'boolean') {
      return value ? "❤️" : "🩶";
    }

    // media type
    switch (value) {
      case MediaType.BOOK: return "📚";
      case MediaType.MOVIE: return "🎬";
      case MediaType.SERIES: return "📺";
      case MediaType.TABLETOP_GAME: return "🎲";
      case MediaType.VIDEO_GAME: return "🎮";
      default: return ""; 
    }
  }

}
