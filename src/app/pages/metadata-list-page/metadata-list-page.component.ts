import { Component, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { SearchListComponent } from "@app/components/search-list/search-list.component";
import { EntityType, MetadataType } from '@app/models/entity.model';
import { debounceTime, Subject } from 'rxjs';
import { MetadataService } from '@app/services/metadata.service';
import { HumanizePipe } from "../../pipe/humanize";
import { NavService } from '@app/services/nav.service';
import { getPaginationLimit } from '@app/models/media-query.model';
import { CollectionLayout } from '@app/models/collection.model';
import { ScreenService } from '@app/services/screen.service';

@Component({
  selector: 'app-metadata-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionBarComponent, SearchListComponent, HumanizePipe],
  templateUrl: './metadata-list-page.component.html'
})
export class MetadataListPageComponent { 

  private route = inject(ActivatedRoute);
  layoutData = signal<[string, EntityType][]>([]);
  type = signal<MetadataType>(MetadataType.PERSON);
  searchQuery = signal<string>('');
  private refreshLayout$ = new Subject<void>();
  context = this.navService.context;
  resultsCount = signal(0);

  isPageReady = signal(false);

  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  canLoadMore = signal<boolean>(true);

  constructor(
    private metadataService: MetadataService,
    private navService: NavService,
    private screenService: ScreenService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(50)
    ).subscribe(() => {
      this.loadLayoutData();
    });

    // wait the end of animation before loading data
    setTimeout(() => 
      this.isPageReady.set(true), 
      this.screenService.isMobile() ? 200 : 0
    );

    effect(() => {
      this.searchQuery();
      this.context();
      const ready = this.isPageReady();

      untracked(() => {
        if (ready) {
          this.currentPage.set(1);
          this.canLoadMore.set(true);
          this.refreshLayout$.next();
        }
      });
    });
  }

  async ngOnInit() {
    const typeParam = this.route.snapshot.paramMap.get('type') as MetadataType;

    if (typeParam) {
      this.type.set(typeParam);
      this.loadLayoutData();
    }
  }

  onScroll() {
    if (!this.isLoading() && this.canLoadMore()) {
      this.currentPage.update(p => p + 1);
      this.loadLayoutData(true);
    }
  }

  async loadLayoutData(isNextPage = false) {
    if (this.isLoading() || !this.isPageReady()) return;
    this.isLoading.set(true);

    // add loading item
    if (this.layoutData().length === 0) {
      this.layoutData.update(current => {
        return [...current, undefined as any];
      });
    }

    // reinit pagination and counter if query has changed
    if (!isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);

      this.resultsCount.set(
        await this.metadataService.getMetadataCount(this.type(), this.searchQuery(), this.context())
      );
    }

    const limit = getPaginationLimit(undefined as any, CollectionLayout.LIST);
    const offset = (this.currentPage() - 1) * limit;
    const pagination = {
      limit: limit, 
      offset: offset
    };
    let data = await this.metadataService.getMetadataLayout(
      this.type(), 
      this.searchQuery(), 
      this.context(), 
      pagination
    );

    if (data.length < limit) {
      this.canLoadMore.set(false);
    }

    // add loading item to the end of results
    if (this.canLoadMore()) {
      data.push(undefined as any);
    }

    this.layoutData.update(current => {
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

}
