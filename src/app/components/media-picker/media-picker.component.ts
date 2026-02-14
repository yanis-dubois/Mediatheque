import { Component, effect, Input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CollectionListComponent } from '@components/collection-list/collection-list.component'
import { MediaRowComponent } from '@components/media-row/media-row.component';

import { CollectionService } from '@app/services/collection.service';
import { Collection, CollectionMediaType } from '@app/models/collection.model';

@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [CollectionListComponent, FormsModule, MediaRowComponent],
  templateUrl: './media-picker.component.html',
  styleUrl: './media-picker.component.css'
})
export class MediaPickerComponent {
  @Input({ required: true }) collection!: Collection;

  onCancel = output<void>();
  onConfirm = output<Set<string>>();

  mediaResults = signal<[string, number, number][]>([]);
  selectedIds = signal<Set<string>>(new Set());
  searchQuery = signal('');

  mediaType = signal<CollectionMediaType>({type: "ALL"});

  constructor(
    private collectionService: CollectionService
  ) {
    effect(async () => {
      await this.onSearch(this.searchQuery());
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.mediaType.set(this.collection.mediaType);
  }

  ngAfterViewInit() {
    this.onSearch('');
  }

  async onSearch(query: string) {
    try {
      this.mediaResults.set(
        await this.collectionService.searchMedia(query, this.mediaType())
      );
    } catch (e) {
      console.error("Error while searching", e);
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
