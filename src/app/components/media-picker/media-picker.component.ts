import { Component, effect, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CollectionListComponent } from '@components/collection-list/collection-list.component'
import { MediaRowComponent } from '@components/media-row/media-row.component';

import { CollectionService } from '@app/services/collection.service';

@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [CollectionListComponent, FormsModule, MediaRowComponent],
  templateUrl: './media-picker.component.html',
  styleUrl: './media-picker.component.css'
})
export class MediaPickerComponent {

  onCancel = output<void>();
  onConfirm = output<Set<string>>();

  isLoading = signal(false);
  mediaResults = signal<[string, number, number][]>([]);
  selectedIds = signal<Set<string>>(new Set());
  searchQuery = signal('');

  constructor(
    private collectionService: CollectionService
  ) {
    effect(async () => {
      await this.onSearch(this.searchQuery());
    }, { allowSignalWrites: true });
  }

  ngAfterViewInit() {
    this.onSearch('');
  }

  async onSearch(query: string) {

    this.isLoading.set(true);
    try {
      this.mediaResults.set(
        await this.collectionService.searchMedia(query)
      );
      setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleSelection(id: string) {
    this.selectedIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }
}
