import { Component, effect, ElementRef, input, output, ViewChild } from '@angular/core';
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
  @ViewChild('mediaTypeSelect') selectRef!: ElementRef<HTMLSelectElement>;

  version = input<number>(0);
  filter = input.required<MediaFilter>();
  filterChange = output<MediaFilter>();
  mediaTypeOptions = Object.values(MediaType);
  statusOptions = Object.values(MediaStatus);

  constructor() {
    effect(() => {
      this.version();
      if (this.selectRef) {
        this.selectRef.nativeElement.value = this.filter().mediaType || '';
      }
    });
  }

  toggleFavorite(event: MouseEvent) {
    event.stopPropagation();
    const currentValue = !!this.filter().favoriteOnly;
    this.updateFilter('favoriteOnly', !currentValue);
  }

  updateFilter(key: keyof MediaFilter, value: any) {
    const updatedFilter = {
      ...this.filter(),
      [key]: value === "" ? undefined : value
    };
    this.filterChange.emit(updatedFilter);
  }

  resetFilter() {
    const updatedFilter = {
      mediaType: undefined,
      status: undefined,
      favoriteOnly: undefined,
      searchQuery: undefined,
    };
    this.filterChange.emit(updatedFilter);
  }
}
