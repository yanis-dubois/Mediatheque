import { Component, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MediaFilter } from '@models/media-query.model';
import { HumanizePipe } from '@pipe/humanize';
import { ClickOutsideDirective } from '@app/directive/click-outside.directive';
import { MediaStatus, MediaType } from '@app/models/media.model';

@Component({
  selector: 'app-filter-manager',
  standalone: true,
  imports: [CommonModule, HumanizePipe, ClickOutsideDirective],
  templateUrl: './filter-manager.component.html',
  styleUrl: './filter-manager.component.css'
})
export class FilterManagerComponent {
  filter = model.required<MediaFilter>();
  isOpen = signal(false);

  mediaTypeOptions = Object.values(MediaType);
  statusOptions = Object.values(MediaStatus);

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
