import { Component, Input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CollectionListComponent } from '@components/collection-list/collection-list.component'
import { MediaRowComponent } from '@components/media-row/media-row.component';

import { CollectionService } from '@app/services/collection.service';
import { Collection, CollectionMediaType } from '@app/models/collection.model';
import { GenericPickerComponent } from "../generic-picker/generic-picker.component";

@Component({
  selector: 'app-media-picker',
  standalone: true,
  imports: [CollectionListComponent, FormsModule, MediaRowComponent, GenericPickerComponent],
  templateUrl: './media-picker.component.html'
})
export class MediaPickerComponent {
  @Input({ required: true }) collection!: Collection;

  onCancel = output<void>();
  onConfirm = output<Set<string>>();

  mediaResults = signal<[string, number, number][]>([]);
  searchQuery = signal('');
  mediaType = signal<CollectionMediaType>({type: "ALL"});
  gap = signal<number>(8);

  constructor(
    private collectionService: CollectionService
  ) {}

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

}
