import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { EntityType, MetadataType } from '@app/models/entity.model';
import { EntityService } from '@app/services/entity.service';
import { NavService } from '@app/services/nav.service';
import { MetadataService } from '@app/services/metadata.service';
import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { CollectionLayout } from '@app/models/collection.model';
import { SortManagerComponent } from "@app/components/sort-manager/sort-manager.component";
import { FilterManagerComponent } from "@app/components/filter-manager/filter-manager.component";
import { getPaginationLimit, MediaFilter, MediaOrder } from '@app/models/media-query.model';
import { CollectionGridComponent } from "@app/components/collection-grid/collection-grid.component";
import { CollectionRowComponent } from "@app/components/collection-row/collection-row.component";
import { MediaCardComponent } from "@app/components/media-card/media-card.component";
import { CollectionColumnComponent } from "@app/components/collection-column/collection-column.component";
import { CollectionListComponent } from "@app/components/collection-list/collection-list.component";
import { MediaRowComponent } from "@app/components/media-row/media-row.component";
import { DropdownComponent } from "@app/components/dropdown/dropdown.component";
import { MediaActionComponent } from "@app/components/media-action/media-action.component";
import { debounceTime, Subject } from 'rxjs';
import { LayoutManagerComponent } from "../../components/layout-manager/layout-manager.component";
import { ScreenService } from '@app/services/screen.service';

@Component({
  selector: 'app-metadata-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionBarComponent, SortManagerComponent, FilterManagerComponent, CollectionGridComponent, CollectionRowComponent, MediaCardComponent, CollectionColumnComponent, CollectionListComponent, MediaRowComponent, DropdownComponent, MediaActionComponent, LayoutManagerComponent],
  templateUrl: './metadata-page.component.html',
})
export class MetadataPageComponent {
  private route = inject(ActivatedRoute);
  private metadataService = inject(MetadataService);
  private entityService = inject(EntityService);
  private navService = inject(NavService);
  private screenService = inject(ScreenService);

  protected readonly CollectionLayout = CollectionLayout;
  collectionLayoutOption = Object.values(CollectionLayout);

  context = this.navService.context;
  type = signal<MetadataType>(MetadataType.PERSON);
  entityType = signal<EntityType>(EntityType.PERSON);
  id = signal<string>('');
  searchQuery = signal<string>('');
  preferredLayout = signal<CollectionLayout>(CollectionLayout.LIST);
  gap = signal<number>(8);
  activeMediaMenuId = signal<string | null>(null);
  rolesMap = signal<Record<string, string[]>>({});

  mediaLayoutData = signal<[string, number, number][]>([]);
  sortOrder = signal<MediaOrder[]>([]);
  filter = signal<MediaFilter>({
    mediaType: undefined,
    status: undefined,
    favoriteOnly: undefined,
    searchQuery: undefined
  });

  metadata = computed(() => {
    return this.entityService.getEntitySignal(this.type() as unknown as EntityType, this.id())();
  });
  name = computed(() => {
    const e = this.metadata();
    if (!e) return 'Loading...';
    return (e as any).name || (e as any).title || 'Unnamed';
  });

  private refreshLayout$ = new Subject<void>();

  constructor() {
    this.refreshLayout$.pipe(
      debounceTime(50)
    ).subscribe(() => {
      this.loadLayoutData();
    });

    effect(() => {
      this.context();
      this.id();
      this.searchQuery();
      this.filter();
      this.sortOrder();
      this.entityService.lastUpdate();
      untracked(() => {
        this.refreshLayout$.next();
      });
    });
  }

  async ngOnInit() {
    const typeParam = this.route.snapshot.paramMap.get('type') as MetadataType;
    const idParam = this.route.snapshot.paramMap.get('id');

    if (typeParam && idParam) {
      this.type.set(typeParam);
      this.entityType.set(typeParam as unknown as EntityType);
      this.id.set(idParam);

      // load info in cache
      await this.entityService.loadById(this.entityType(), this.id());

      // load layout data
      this.loadLayoutData();

      // load roles
      const roles = await this.metadataService.getDescriptorRolesMap(
        this.type(), 
        parseInt(idParam, 10)
      );
      this.rolesMap.set(roles);
    }
  }

  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  canLoadMore = signal<boolean>(true);

  onScroll() {
    if (!this.isLoading() && this.canLoadMore()) {
      this.currentPage.update(p => p + 1);
      this.loadLayoutData(true);
    }
  }

  async loadLayoutData(isNextPage = false) {
    if (this.isLoading()) return;
    this.isLoading.set(true);

    // reinit pagination if query has changed
    if (!isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);
    }

    const limit = getPaginationLimit(this.screenService.size(), this.preferredLayout());

    const pagination = {limit: limit, offset: (this.currentPage() - 1) * limit};
    let data = await this.metadataService.searchInMetadata(
      this.type(),
      parseInt(this.id(), 10),
      this.searchQuery(),
      this.sortOrder(),
      this.filter(),
      this.context(),
      pagination
    );

    if (data.length < limit) {
      this.canLoadMore.set(false);
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

  getRolesForMedia(mediaId: string): string[] {
    return this.rolesMap()[mediaId] || [];
  }

  onFilterChanged(filter: MediaFilter) {
    this.filter.set(filter);
  }

  onSortChanged(sortOrder: MediaOrder[]) {
    this.sortOrder.set(sortOrder);
  }

  protected isMenuOpen(id?: string): boolean {
    return this.activeMediaMenuId() !== null && this.activeMediaMenuId() === id
  }

}
