import { Pipe, PipeTransform } from '@angular/core';
import { TAG_ORDER, TagType } from '@app/models/media.model';

@Pipe({
  name: 'filterTags',
  standalone: true
})
export class FilterTagsPipe implements PipeTransform {
  transform(tags: Record<TagType, any>, allowedTypes: TagType[]): { key: TagType, value: any }[] {
    if (!tags) return [];

    return Object.entries(tags)
      .filter(([key]) => allowedTypes.includes(key as TagType))
      .map(([key, value]) => ({ key: key as TagType, value }))
      .sort((a, b) => {
        const orderA = TAG_ORDER[a.key] ?? 99;
        const orderB = TAG_ORDER[b.key] ?? 99;
        return orderA - orderB;
      });
  }
}
