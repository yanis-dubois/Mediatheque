import { Component, Input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CollectionsListComponent } from '@components/collections-list/collections-list.component'

import { CollectionService } from '@app/services/collection.service';
import { GenericPickerComponent } from "../generic-picker/generic-picker.component";
import { LibraryMedia } from '@app/models/media.model';
import { CollectionMediaType } from '@app/models/collection.model';
import { CollectionRowItemComponent } from "../collection-row-item/collection-row-item.component";

@Component({
  selector: 'app-collection-picker',
  standalone: true,
  imports: [CollectionsListComponent, FormsModule, GenericPickerComponent, CollectionRowItemComponent],
  templateUrl: './collection-picker.component.html'
})
export class CollectionPickerComponent {
  @Input({ required: true }) media!: LibraryMedia;

  onCancel = output<void>();
  onConfirm = output<Set<string>>();

  collectionResults = signal<string[]>([]);
  searchQuery = signal('');
  mediaType = signal<CollectionMediaType>({type: "ALL"});

  constructor(
    private collectionService: CollectionService
  ) {}

  ngOnInit() {
    this.mediaType.set({type:"SPECIFIC", value: this.media.mediaType});
  }

  ngAfterViewInit() {
    this.onSearch('');
  }

  async onSearch(query: string) {
    try {
      this.collectionResults.set(
        await this.collectionService.searchCollection(query, this.mediaType(), true)
      );
    } catch (e) {
      console.error("Error while searching", e);
    }
  }

}
