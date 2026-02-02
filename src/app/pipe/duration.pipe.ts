import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duration',
  standalone: true
})
export class DurationPipe implements PipeTransform {

  // 134 -> 2h14min
  transform(minutes: number): string {
    if (!minutes || minutes <= 0) return '0min';

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

}
