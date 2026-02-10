import { Component, effect, input, Input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { SortManagerComponent } from '@components/sort-manager/sort-manager.component';
import { FilterManagerComponent } from '@components/filter-manager/filter-manager.component';
import { CollectionGridComponent } from '@components/collection-grid/collection-grid.component';
import { CollectionColumnComponent } from '@components/collection-column/collection-column.component';
import { CollectionRowComponent } from '@components/collection-row/collection-row.component';

import { Collection, CollectionLayout, CollectionMediaType, CollectionType } from '@models/collection.model';
import { MediaFilter, MediaOrder } from '@models/media-query.model';

import { CollectionService } from '@services/collection.service';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-collection-details',
  standalone: true,
  imports: [CommonModule, RouterModule, SortManagerComponent, FilterManagerComponent, CollectionGridComponent, CollectionColumnComponent, CollectionRowComponent],
  templateUrl: './collection-details.component.html',
  styleUrl: './collection-details.component.css'
})
export class CollectionDetailsComponent {
  @Input({ required: true }) collection!: Collection;
  @Input({ required: true }) loading!: boolean;

  // media data needed for virtualizing (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();
  onLayoutNeedsRefresh = output<void>();

  protected readonly CollectionLayout = CollectionLayout;
  collectionLayoutOption = Object.values(CollectionLayout);

  favorite = signal(false);
  name = signal('');
  isEditingName = signal(false);
  isSavingName = signal(false);
  description = signal('');
  isEditingDescription = signal(false);
  isSavingDescription = signal(false);
  collectionType = signal<CollectionType>(CollectionType.MANUAL); // set when created
  collectionMediaType = signal<CollectionMediaType>({type: 'ALL'}); // automatically determined
  preferredLayout = signal<CollectionLayout>(CollectionLayout.GRID);
  sortOrder = signal<MediaOrder[]>([]);

  filter = signal<MediaFilter>({});

  private refreshLayout$ = new Subject<void>();

  constructor(
    private collectionService: CollectionService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(200),
    ).subscribe(() => {
      this.onLayoutNeedsRefresh.emit();
    });

    effect(() => {
      const newSort = this.sortOrder();
      this.updateSort(newSort);
    }, { allowSignalWrites: true });

    effect(() => {
      const newFilter = this.filter();
      this.updateFilter(newFilter);
    }, { allowSignalWrites: true });
  }

  async ngOnInit() {
    this.name.set(this.collection.name);
    this.description.set(this.collection.description);
    this.favorite.set(this.collection.favorite);
    this.collectionType.set(this.collection.collectionType);
    this.collectionMediaType.set(this.collection.mediaType);
    this.preferredLayout.set(this.collection.preferredLayout);
    this.sortOrder.set(this.collection.sortOrder);

    if (this.collection.collectionType == CollectionType.DYNAMIC) {
      this.filter.set(this.collection.filter);
    }
  }

  async onToggleFavorite() {
    const isFavorite = !this.favorite();

    try {
      await this.collectionService.toggleFavorite(this.collection.id, isFavorite);
      this.favorite.set(isFavorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

  async onNameBlur(newName: string) {
    this.isEditingName.set(false);
  
    // save only if changed
    if (newName !== this.name()) {
      this.isSavingName.set(true);
      try {
        await this.collectionService.updateName(this.collection.id, newName);
        this.name.set(newName);
      } catch (e) {
        console.error("Failed to save name :", e);
      } finally {
        // "saving" feedback for 500ms
        setTimeout(() => this.isSavingName.set(false), 500);
      }
    }
  }

  async onDescriptionBlur(newDescription: string) {
    if (!this.collection) return;
    this.isEditingDescription.set(false);
  
    // save only if changed
    if (newDescription !== this.name()) {
      this.isSavingDescription.set(true);
      try {
        await this.collectionService.updateDescription(this.collection.id, newDescription);
        this.description.set(newDescription);
      } catch (e) {
        console.error("Failed to save description :", e);
      } finally {
        // "saving" feedback for 500ms
        setTimeout(() => this.isSavingDescription.set(false), 500);
      }
    }
  }

  async onLayoutChange(newLayout: string) {
    const view = newLayout as CollectionLayout;

    try {
      await this.collectionService.updatePreferredLayout(this.collection.id, view);
      this.preferredLayout.set(view);
    } catch (e) {
      console.error("Error while updating collection type", e);
    }
  }

  async updateSort(newSort: MediaOrder[]) {
    try {
      await this.collectionService.updateSort(this.collection.id, newSort);
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Error while updating collection type", e);
    }
  }

  private async updateFilter(newFilters: MediaFilter) {
    try {
      await this.collectionService.updateFilter(this.collection.id, newFilters);
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Error while updating collection filter:", e);
    }
  }
}
