import { Component, effect, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MediaFilter } from '@models/media-query.model';
import { HumanizePipe } from '@pipe/humanize';
import { MediaStatus, MediaType } from '@app/models/media.model';
import { DropdownTriggerDirective } from '@app/directive/dropdown.directive'

@Component({
  selector: 'app-filter-manager',
  standalone: true,
  imports: [CommonModule, DropdownTriggerDirective, HumanizePipe],
  templateUrl: './filter-manager.component.html',
  styleUrl: './filter-manager.component.css'
})
export class FilterManagerComponent {

  filter = model.required<MediaFilter>();
  mediaTypeOptions = Object.values(MediaType);
  statusOptions = Object.values(MediaStatus);

  constructor() {
    effect(() => {
      console.log("FilterManager reçu :", this.filter());
    });
  }

  toggleFavorite(event: MouseEvent) {
    event.stopPropagation();
    const currentValue = !!this.filter().favoriteOnly;
    this.updateFilter('favoriteOnly', !currentValue);
  }

  updateFilter(key: keyof MediaFilter, value: any) {
    this.filter.update(f => ({
      ...f,
      [key]: value === "" ? undefined : value
    }));
  }

  resetFilter() {
    this.filter.set({ 
      mediaType: undefined,
      status: undefined,
      favoriteOnly: undefined,
      searchQuery: undefined,
    });
  }
}
