import { Component, effect, input, Input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { SortManagerComponent } from '@components/sort-manager/sort-manager.component';
import { CollectionGridComponent } from '@components/collection-grid/collection-grid.component';
import { CollectionColumnComponent } from '@components/collection-column/collection-column.component';
import { CollectionRowComponent } from '@components/collection-row/collection-row.component';

import { Collection, CollectionLayout, CollectionMediaType, CollectionType } from '@models/collection.model';
import { MediaOrder } from '@models/media-query.model';

import { CollectionService } from '@services/collection.service';

@Component({
  selector: 'app-collection-details',
  standalone: true,
  imports: [CommonModule, RouterModule, SortManagerComponent, CollectionGridComponent, CollectionColumnComponent, CollectionRowComponent],
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

  constructor(
    private collectionService: CollectionService
  ) {
    effect(() => {
      const newSort = this.sortOrder();

      // save only if changed
      if (this.collection && JSON.stringify(newSort) !== JSON.stringify(this.collection.sortOrder)) {
        this.onSortOrderChange(newSort);
      }
    });
  }

  async ngOnInit() {
    this.name.set(this.collection.name);
    this.description.set(this.collection.description);
    this.favorite.set(this.collection.favorite);
    this.collectionType.set(this.collection.collectionType);
    this.collectionMediaType.set(this.collection.mediaType);
    this.preferredLayout.set(this.collection.preferredLayout);
    this.sortOrder.set(this.collection.sortOrder);
  }

  async onToggleFavorite() {
    if (!this.collection) return;
    const isFavorite = !this.favorite();

    try {
      await this.collectionService.toggleFavorite(this.collection.id, isFavorite);
      this.favorite.set(isFavorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

  async onNameBlur(newName: string) {
    if (!this.collection) return;
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
    if (!this.collection) return;
    const view = newLayout as CollectionLayout;

    try {
      await this.collectionService.updatePreferredLayout(this.collection.id, view);
      this.preferredLayout.set(view);
    } catch (e) {
      console.error("Error while updating collection type", e);
    }
  }

  private isProcessing = false;

  async onSortOrderChange(newSort: MediaOrder[]) {
    if (!this.collection || this.isProcessing) return;

    this.isProcessing = true;
    try {
      await this.collectionService.updateSortOrder(this.collection.id, newSort);
      // update media list 
      this.onLayoutNeedsRefresh.emit();
    } catch (e) {
      console.error("Error while updating collection type", e);
    } finally {
      this.isProcessing = false;
    }
  }
}
