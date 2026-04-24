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

  private readonly LIMIT = 16;

  onCancel = output<void>();
  onConfirm = output<Set<string>>();

  mediaResults = signal<[string, number, number][]>([]);
  searchQuery = signal('');
  mediaType = signal<CollectionMediaType>({type: "ALL"});
  gap = signal<number>(8);
  mediaCount = signal(0);

  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  canLoadMore = signal<boolean>(true);

  constructor(
    private collectionService: CollectionService
  ) {}

  ngOnInit() {
    this.mediaType.set(this.collection.mediaType);
  }

  ngAfterViewInit() {
    this.onSearch('');
  }

  async onSearch(query: string, isNextPage = false) {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    // reinit pagination if query has changed
    if (!isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);

      this.mediaCount.set(
        await this.collectionService.getMediaCountFromSearch(query, this.mediaType())
      );
    }

    const pagination = {limit: this.LIMIT, offset: (this.currentPage() - 1) * this.LIMIT};
    try { 
      let data = await this.collectionService.searchMedia(query, this.mediaType(), pagination);

      if (data.length < this.LIMIT) {
        this.canLoadMore.set(false);
      }

      this.mediaResults.update(current => {
        // delete loading item
        const base = current.filter(item => item !== undefined);
  
        // fill results
        if (isNextPage) {
          return [...base, ...data];
        }
        // change result
        return data;
      });
    }
    catch (e) {
      console.error("Error while searching", e);
    } finally {
      this.isLoading.set(false);
    }
  }

  onScroll() {
    if (!this.isLoading() && this.canLoadMore()) {
      this.currentPage.update(p => p + 1);
      this.onSearch(this.searchQuery(), true);
    }
  }

}
