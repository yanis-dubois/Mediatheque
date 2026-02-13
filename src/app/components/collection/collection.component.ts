import { Component, effect, Input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DropdownComponent } from '@components/dropdown/dropdown.component'
import { SortManagerComponent } from '@components/sort-manager/sort-manager.component';
import { FilterManagerComponent } from '@components/filter-manager/filter-manager.component';
import { CollectionGridComponent } from '@components/collection-grid/collection-grid.component';
import { CollectionColumnComponent } from '@components/collection-column/collection-column.component';
import { CollectionRowComponent } from '@components/collection-row/collection-row.component';
import { CollectionListComponent } from "@components/collection-list/collection-list.component";
import { CollectionLineComponent } from '@components/collection-line/collection-line.component';
import { MediaCardComponent } from '@components/media-card/media-card.component';
import { MediaRowComponent } from "@components/media-row/media-row.component";
import { MediaPickerComponent } from '@components/media-picker/media-picker.component'

import { Collection, CollectionDisplayMode, CollectionLayout, CollectionMediaType, CollectionType } from '@models/collection.model';
import { MediaFilter, MediaOrder } from '@models/media-query.model';

import { CollectionService } from '@services/collection.service';
import { debounceTime, Subject } from 'rxjs';
import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";
import { MediaActionComponent } from "../media-action/media-action.component";
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CommonModule, RouterModule, HumanizePipe, EmojizePipe, SortManagerComponent, FilterManagerComponent, CollectionLineComponent, CollectionGridComponent, CollectionColumnComponent, CollectionRowComponent, CollectionListComponent, MediaCardComponent, MediaRowComponent, MediaPickerComponent, DropdownComponent, MediaActionComponent],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss'
})
export class CollectionComponent {
  @Input({ required: true }) id!: string;
  @Input({ required: true }) view!: CollectionDisplayMode;

  // media data needed for virtualizing (id, width, height)
  mediaLayoutData = signal<[string, number, number][]>([]);
  onLayoutNeedsRefresh = output<void>();

  // enums
  protected readonly CollectionDisplayMode = CollectionDisplayMode;
  protected readonly CollectionLayout = CollectionLayout;
  protected readonly CollectionType = CollectionType;
  collectionLayoutOption = Object.values(CollectionLayout);

  collection!: Collection;
  loading = true;
  error?: string;

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

  // for dynamic collection
  filter = signal<MediaFilter>({});

  // for manual collection
  showPicker = signal(false);

  // media menu
  activeMediaMenuId = signal<string | null>(null);

  private refreshLayout$ = new Subject<void>();
  private isInitialized = false;

  constructor(
    private mediaService: MediaService,
    private collectionService: CollectionService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(200)
    ).subscribe(() => {
      this.loadLayoutData();
    });

    // update layout on media change for dynamic collection
    effect(() => {
      this.mediaService.lastUpdate(); 

      untracked(() => {
        if (this.collectionType() === CollectionType.DYNAMIC) {
          this.refreshLayout$.next();
        }
      });
    });
  }

  async ngOnInit() {
    try {
      this.collection = await this.collectionService.getInfo(this.id);
      this.loadLayoutData();

      // setup signals
      if (this.collection) {
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

        this.isInitialized = true;
      }
    } catch (e) {
      console.error(e);
      this.error = 'Collection not found 😢';
    } finally {
      this.loading = false;
    }
  }

  async loadLayoutData() {
    this.mediaLayoutData.set(
      await this.collectionService.getLayoutData(this.id)
    );
  }

  async onToggleFavorite() {
    const isFavorite = !this.favorite();

    try {
      await this.collectionService.toggleFavorite(this.id, isFavorite);
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
        await this.collectionService.updateName(this.id, newName);
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
    this.isEditingDescription.set(false);
  
    // save only if changed
    if (newDescription !== this.name()) {
      this.isSavingDescription.set(true);
      try {
        await this.collectionService.updateDescription(this.id, newDescription);
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
      await this.collectionService.updatePreferredLayout(this.id, view);
      this.preferredLayout.set(view);
    } catch (e) {
      console.error("Error while updating collection type", e);
    }
  }

  async onSortChanged() {
    try {
      await this.collectionService.updateSort(this.id, this.sortOrder());
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Error while updating collection type", e);
    }
  }

  async onFilterChanged() {
    if (this.collectionType() === CollectionType.MANUAL) return;
    const newFilter = this.filter();

    let mediaTypeHasChanged = false;
    if (newFilter.mediaType) {
      this.collectionMediaType.set({
        type: "SPECIFIC",
        value: newFilter.mediaType
      })
      mediaTypeHasChanged = true;
    }
    else if (this.collectionMediaType().type == "SPECIFIC") {
      this.collectionMediaType.set({
        type: "ALL"
      })
      mediaTypeHasChanged = true;
    }

    try {
      await this.collectionService.updateFilter(this.id, newFilter);
      if (mediaTypeHasChanged) {
        await this.collectionService.updateMediaType(this.id, this.collectionMediaType());
      }
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Error while updating collection filter:", e);
    }
  }

  async addSelectedMedia(newMediaIds: Set<string>) {
    if (newMediaIds.size < 1) return;

    try {
      await this.collectionService.addMediaBatch(this.id, newMediaIds);
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Error while adding media to collection", e);
    }
  }

  async removeMediaFromCollection(mediaId: string) {
    if (mediaId === "") return;
    console.log("remove request : " + mediaId);

    try {
      await this.collectionService.removeMedia(this.id, mediaId);
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Error while adding media to collection", e);
    }
  }

  protected isMenuOpen(id?: string): boolean {
    return this.activeMediaMenuId() !== null && this.activeMediaMenuId() === id
  }

}
