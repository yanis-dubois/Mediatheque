import { Component, computed, effect, ElementRef, inject, input, Input, signal, untracked, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';

import { confirm } from '@tauri-apps/plugin-dialog';

import { DropdownComponent } from '@components/dropdown/dropdown.component';
import { SortManagerComponent } from '@components/sort-manager/sort-manager.component';
import { FilterManagerComponent } from '@components/filter-manager/filter-manager.component';
import { CollectionGridComponent } from '@components/collection-grid/collection-grid.component';
import { CollectionColumnComponent } from '@components/collection-column/collection-column.component';
import { CollectionRowComponent } from '@components/collection-row/collection-row.component';
import { CollectionListComponent } from "@components/collection-list/collection-list.component";
import { CollectionLineComponent } from '@components/collection-line/collection-line.component';
import { MediaCardComponent } from '@components/media-card/media-card.component';
import { MediaRowComponent } from "@components/media-row/media-row.component";
import { MediaPickerComponent } from '@components/media-picker/media-picker.component';
import { MediaActionComponent } from "@components/media-action/media-action.component";
import { ActionBarComponent } from "@components/action-bar/action-bar.component";

import { CollectionDisplayMode, CollectionLayout, CollectionType } from '@models/collection.model';
import { MediaFilter, MediaOrder } from '@models/media-query.model';

import { CollectionService } from '@services/collection.service';
import { CollectionActionComponent } from "../collection-action/collection-action.component";
import { PinService } from '@app/services/pin.service';
import { EmojizePipe } from "../../pipe/emojize";
import { EntityService } from '@app/services/entity.service';
import { LayoutManagerComponent } from "@app/components/layout-manager/layout-manager.component";

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CommonModule, RouterModule, SortManagerComponent, FilterManagerComponent, CollectionLineComponent, CollectionGridComponent, CollectionColumnComponent, CollectionRowComponent, CollectionListComponent, MediaCardComponent, MediaRowComponent, MediaPickerComponent, DropdownComponent, MediaActionComponent, ActionBarComponent, CollectionActionComponent, EmojizePipe, LayoutManagerComponent],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss'
})
export class CollectionComponent {
  @Input({ required: true }) view!: CollectionDisplayMode;
  id = input.required<string>();

  nameInput = viewChild<ElementRef<HTMLHeadingElement>>('nameInput');
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hasFocused = false;
  listPadding = signal<number>(8);

  // media data needed for virtualizing (id, width, height)
  mediaLayoutData = signal<[string, number, number][]>([]);

  // enums
  protected readonly CollectionDisplayMode = CollectionDisplayMode;
  protected readonly CollectionLayout = CollectionLayout;
  protected readonly CollectionType = CollectionType;
  collectionLayoutOption = Object.values(CollectionLayout);

  collection = computed(() => {
    return this.entityService.getCollection(this.id(), true);
  });
  name = computed(() => this.collection()?.name ?? 'Unnamed Collection');
  favorite = computed(() => this.collection()?.favorite ?? false);
  description = computed(() => this.collection()?.description ?? '');
  collectionType = computed(() => this.collection()?.collectionType ?? CollectionType.MANUAL);
  collectionMediaType = computed(() => this.collection()?.mediaType ?? {type: 'ALL'});
  preferredLayout = computed(() => this.collection()?.preferredLayout ?? CollectionLayout.GRID);
  sortOrder = computed(() => this.collection()?.sortOrder ?? []);
  // dynamic collection
  filter = computed(() => this.collection()?.filter ?? {
    mediaType: undefined,
    status: undefined,
    favoriteOnly: undefined,
    searchQuery: undefined
  });

  // for manual collection
  showPicker = signal(false);

  // media menu
  activeMediaMenuId = signal<string | null>(null);

  searchQuery = signal<string>('');

  private refreshLayout$ = new Subject<void>();

  constructor(
    private entityService: EntityService,
    private collectionService: CollectionService,
    private pinService: PinService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(50)
    ).subscribe(() => {
      this.loadLayoutData();
    });

    effect(() => {
      this.id();
      this.entityService.lastUpdate();
      untracked(() => {
        this.refreshLayout$.next();
      });
    });

    effect(async () => {
      this.searchQuery();
      this.refreshLayout$.next();
    });

    // effect to select name editing when creating a new collection
    effect(() => {
      const input = this.nameInput();
      const isEditMode = this.route.snapshot.queryParamMap.get('edit') === 'true';

      if (input && isEditMode && !this.hasFocused && this.name()) {
        this.hasFocused = true;

        setTimeout(() => {
          this.focusAndSelectText(input.nativeElement);

          // clean url
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { edit: null },
            queryParamsHandling: 'merge',
            replaceUrl: true 
          });
        }, 100);
      }
    });
  }

  private focusAndSelectText(el: HTMLElement) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
  validateName(el: HTMLElement) {
    el.blur();

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }

  async loadLayoutData() {
    this.mediaLayoutData.set(
      await this.collectionService.getLayoutData(this.id(), this.searchQuery())
    );
  }

  async onToggleFavorite() {
    try {
      await this.collectionService.toggleFavorite(this.id(), !this.favorite());
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

  async onNameBlur(newName: string, el: HTMLElement) { 
    const isEmpty = newName.trim().length === 0;
    const finalName = isEmpty ? 'Unnamed Collection' : newName;

    if (isEmpty) {
      el.innerText = finalName;
    }

    try {
      await this.collectionService.updateName(this.id(), finalName);
    } catch (e) {
      console.error("Failed to save name :", e);
    }
  }

  async onDescriptionBlur(newDescription: string) {
    // save only if changed
    if (newDescription === this.description()) return;

    try {
      await this.collectionService.updateDescription(this.id(), newDescription);
    } catch (e) {
      console.error("Failed to save description :", e);
    }
  }

  async onLayoutChange(newLayout: string) {
    const view = newLayout as CollectionLayout;

    try {
      await this.collectionService.updatePreferredLayout(this.id(), view);
    } catch (e) {
      console.error("Error while updating collection type", e);
    }
  }

  async onSortChanged(newSort: MediaOrder[]) {
    try {
      await this.collectionService.updateSort(this.id(), newSort);
      this.refreshLayout$.next(); 
    } catch (e) {
      console.error("Sort update failed", e);
    }
  }

  filterVersion = signal(0);
  async onFilterChanged(newFilter: MediaFilter) {
    const conflictingContext = this.pinService.checkPinIncompatibility(this.id(), newFilter.mediaType);
    if (conflictingContext) {
      const contextName = conflictingContext.type === 'SPECIFIC' ? conflictingContext.value : 'actuel';
      const confirmed = await confirm(
        `Cette collection est épinglée dans la section "${contextName}". Changer le type de média la détachera de cette page. Voulez-vous continuer ?`,
        { title: 'Confirmation de modification', kind: 'warning' }
      );

      if (!confirmed) {
        this.filterVersion.update(v => v + 1);
        return;
      }
    }

    try {
      await this.collectionService.updateFilter(this.id(), newFilter);
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Filter update failed", e);
    }
  }

  async addSelectedMedia(newMediaIds: Set<string>) {
    if (newMediaIds.size < 1) return;

    try {
      await this.collectionService.addMediaBatchToCollection(this.id(), newMediaIds);
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Error while adding media to collection", e);
    }
  }

  async removeMediaFromCollection(mediaId: string) {
    if (mediaId === "") return;

    try {
      await this.collectionService.removeMedia(this.id(), mediaId);
      this.refreshLayout$.next();
    } catch (e) {
      console.error("Error while adding media to collection", e);
    }
  }

  protected isMenuOpen(id?: string): boolean {
    return this.activeMediaMenuId() !== null && this.activeMediaMenuId() === id
  }

}
