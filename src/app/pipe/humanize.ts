import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'humanize',
  standalone: true
})
export class HumanizePipe implements PipeTransform {

  // SCREAMING_SNAKE_CASE -> Screaming Snake Case
  transform(text: string): string {
    return text
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  }

}
