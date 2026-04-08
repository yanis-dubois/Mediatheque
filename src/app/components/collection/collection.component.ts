import { Component, computed, effect, ElementRef, inject, input, Input, signal, untracked, ViewChild, viewChild } from '@angular/core';
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
import { getPaginationLimit, MediaFilter, MediaOrder } from '@models/media-query.model';

import { CollectionService } from '@services/collection.service';
import { CollectionActionComponent } from "../collection-action/collection-action.component";
import { PinService } from '@app/services/pin.service';
import { EmojizePipe } from "../../pipe/emojize";
import { EntityService } from '@app/services/entity.service';
import { LayoutManagerComponent } from "@app/components/layout-manager/layout-manager.component";
import { ScreenService } from '@app/services/screen.service';

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

  @ViewChild('pickerPopover') pickerPopover!: ElementRef<HTMLElement>;
  isPickerVisible = signal(false);

  nameInput = viewChild<ElementRef<HTMLHeadingElement>>('nameInput');
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hasFocused = false;
  listPadding = signal<number>(8);

  // media data needed for virtualizing (id, width, height) ['', 2, 3]
  mediaLayoutData = signal<[string, number, number][]>([['', 2, 3]]);

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

  // media menu
  activeMediaMenuId = signal<string | null>(null);

  searchQuery = signal<string>('');

  private refreshLayout$ = new Subject<boolean>();

  isPageReady = signal(false);

  screenService = inject(ScreenService);

  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  canLoadMore = signal<boolean>(true);

  constructor(
    private entityService: EntityService,
    private collectionService: CollectionService,
    private pinService: PinService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(50)
    ).subscribe((isUpdate) => {
      this.loadLayoutData(isUpdate, false);
    });

    // wait the end of animation before loading data
    setTimeout(() => 
      this.isPageReady.set(true), 
      this.screenService.isMobile() ? 200 : 0
    );

    effect(() => {
      this.id();
      this.searchQuery();
      const ready = this.isPageReady();

      untracked(() => {
        if (ready) {
          this.currentPage.set(1);
          this.canLoadMore.set(true);
          this.refreshLayout$.next(false);
        }
      });
    });

    effect(() => {
      this.entityService.lastUpdate();

      untracked(() => {
        this.refreshLayout$.next(true);
      });
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
        }, this.screenService.isMobile() ? 200 : 50);
      }
    });
  }

  async loadLayoutData(isUpdate: boolean, isNextPage = false) {
    if (this.isLoading() || !this.isPageReady()) return;
    this.isLoading.set(true);

    // add loading item
    if (this.mediaLayoutData().length === 0) {
      this.mediaLayoutData.update(current => {
        return [...current, undefined as any];
      });
    }

    // reinit pagination if query has changed
    if (!isUpdate && !isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);
    }

    const limit = getPaginationLimit(this.screenService.size(), this.preferredLayout(), this.view);
    const offset = (this.currentPage() - 1) * limit;
    const pagination = {
      limit: isUpdate ? this.currentPage()*limit : limit, 
      offset: isUpdate ? 0 : offset
    };
    let data = await this.collectionService.getLayoutData(this.id(), this.searchQuery(), pagination);

    if (data.length < limit) {
      this.canLoadMore.set(false);
    }

    // add loading item to the end of results
    if (this.canLoadMore()) {
      data.push(undefined as any);
    }

    this.mediaLayoutData.update(current => {
      // delete loading item
      const base = current.filter(item => item !== undefined);

      // fill results
      if (isNextPage) {
        return [...base, ...data];
      }

      // change result
      return data;
    });

    this.isLoading.set(false);
  }

  // picker for manual collection
  openPicker(event: MouseEvent) {
    event.stopPropagation();
    this.isPickerVisible.set(true);
    setTimeout(() => this.pickerPopover.nativeElement.showPopover());
  }

  async closePicker() {
    this.pickerPopover.nativeElement.classList.add('closing');
    await new Promise(resolve => setTimeout(resolve, 300));

    this.pickerPopover.nativeElement.hidePopover();
    this.pickerPopover.nativeElement.classList.remove('closing');
    this.isPickerVisible.set(false);
  }

  onScroll() {
    if (!this.isLoading() && this.canLoadMore()) {
      this.currentPage.update(p => p + 1);
      this.loadLayoutData(false, true);
    }
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
    } catch (e) {
      console.error("Filter update failed", e);
    }
  }

  async addSelectedMedia(newMediaIds: Set<string>) {
    if (newMediaIds.size < 1) return;

    try {
      await this.collectionService.addMediaBatchToCollection(this.id(), newMediaIds);
    } catch (e) {
      console.error("Error while adding media to collection", e);
    }
  }

  async removeMediaFromCollection(mediaId: string) {
    if (mediaId === "") return;

    try {
      await this.collectionService.removeMedia(this.id(), mediaId);
    } catch (e) {
      console.error("Error while adding media to collection", e);
    }
  }

  protected isMenuOpen(id?: string): boolean {
    return this.activeMediaMenuId() !== null && this.activeMediaMenuId() === id
  }

}
