import { Component, Input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CollectionsListComponent } from '@components/collections-list/collections-list.component'

import { CollectionService } from '@app/services/collection.service';
import { GenericPickerComponent } from "../generic-picker/generic-picker.component";
import { LibraryMedia } from '@app/models/media.model';
import { CollectionLayout, CollectionMediaType } from '@app/models/collection.model';
import { CollectionRowItemComponent } from "../collection-row-item/collection-row-item.component";
import { getPaginationLimit } from '@app/models/media-query.model';

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

  private readonly LIMIT = getPaginationLimit(undefined as any, CollectionLayout.LIST);

  collectionResults = signal<string[]>([]);
  searchQuery = signal('');
  mediaType = signal<CollectionMediaType>({type: "ALL"});
  collectionCount = signal(0);

  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  canLoadMore = signal<boolean>(true);

  constructor(
    private collectionService: CollectionService
  ) {}

  ngOnInit() {
    this.mediaType.set({type:"SPECIFIC", value: this.media.mediaType});
  }

  ngAfterViewInit() {
    this.onSearch('');
  }

  async onSearch(query: string, isNextPage = false) {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    // add loading item
    if (this.collectionResults().length === 0) {
      this.collectionResults.update(current => {
        return [...current, undefined as any];
      });
    }

    // reinit pagination if query has changed
    if (!isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);

      this.collectionCount.set(
        await this.collectionService.getCollectionCount(query, this.mediaType(), true)
      );
    }

    const pagination = {limit: this.LIMIT, offset: (this.currentPage() - 1) * this.LIMIT};
    try { 
      let data = await this.collectionService.searchCollection(query, this.mediaType(), pagination, true);

      if (data.length < this.LIMIT) {
        this.canLoadMore.set(false);
      }

      // add loading item to the end of results
      if (this.canLoadMore()) {
        data.push(undefined as any);
      }

      this.collectionResults.update(current => {
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
