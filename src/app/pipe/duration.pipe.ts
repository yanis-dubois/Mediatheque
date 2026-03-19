import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duration',
  standalone: true
})
export class DurationPipe implements PipeTransform {

  // 134min -> 2h14min
  // 1200s -> 20min
  transform(value: number, unit: 's' | 'm' = 'm', truncate: boolean = false, showUnit: boolean = true): string {
    const minUnit = showUnit ? 'min' : '';
    const hourUnit = showUnit ? 'h' : '';

    if (!value || value <= 0) return `0${minUnit}`;

    const totalMinutes = unit === 's' ? Math.floor(value / 60) : value;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m}${minUnit}`;
    if (m === 0 || truncate) return `${h}${hourUnit}`;
    return `${h}h ${m.toString().padStart(2, '0')}${minUnit.charAt(0)}`;
  }

}
