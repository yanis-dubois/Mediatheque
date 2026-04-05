import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { SearchListComponent } from "@app/components/search-list/search-list.component";
import { EntityType } from '@app/models/entity.model';
import { EntityService } from '@app/services/entity.service';
import { debounceTime, Subject } from 'rxjs';
import { ApiService } from '@app/services/api.service';
import { ApiSearchListComponent } from "@app/components/api-search-list/api-search-list.component";
import { ApiSearchResult, MediaType } from '@app/models/media.model';
import { NavService } from '@app/services/nav.service';
import { CollectionLayout, CollectionMediaType } from '@app/models/collection.model';
import { HumanizePipe } from "../../pipe/humanize";
import { getPaginationLimit } from '@app/models/media-query.model';
import { ScreenService } from '@app/services/screen.service';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionBarComponent, SearchListComponent, ApiSearchListComponent, HumanizePipe],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss'
})
export class SearchPageComponent {

  screenService = inject(ScreenService);
  mode = this.navService.searchMode;
  mediaType = signal<CollectionMediaType>({type: 'ALL'});
  searchQuery = signal<string>('');

  private refreshLibraryData$ = new Subject<void>();
  layoutData = signal<[string, EntityType][]>([]);

  private refreshInternetData$ = new Subject<void>();
  apiResults = signal<ApiSearchResult[]>([]);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  canLoadMore = signal<boolean>(true);

  context = computed(() => {
    return this.navService.context()
  });

  constructor(
    private entityService: EntityService,
    private apiService: ApiService,
    private navService: NavService
  ) {
    this.refreshInternetData$.pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.loadApiData();
    });

    this.refreshLibraryData$.pipe(
      debounceTime(50)
    ).subscribe(() => {
      this.loadLibraryData();
    });

    effect(() => {
      const query = this.searchQuery();
      this.entityService.lastUpdate();
      const ctx = this.navService.context();

      if (this.mediaType() !== ctx) {
        this.mediaType.set(ctx);
        this.layoutData.set([]);
        this.apiResults.set([]);
      }

      if (!query || query.trim().length === 0) {
        this.layoutData.set([]);
        this.apiResults.set([]);
        if (this.mode() == 'api')
          return;
      }

      if (this.mode() === 'library') 
        this.refreshLibraryData$.next();
      else this.refreshInternetData$.next();
    }, { allowSignalWrites: true });
  }

  private async loadLibraryData(isNextPage = false) {
    this.isLoading.set(true);

    // add loading item
    if (this.layoutData().length === 0) {
      this.layoutData.update(current => {
        return [...current, undefined as any];
      });
    }

    if (!isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);
    }

    try {
      const limit = getPaginationLimit(this.screenService.size(), CollectionLayout.LIST);
      const pagination = {limit: limit, offset: (this.currentPage() - 1) * limit};
      let newResults = await this.entityService.getLayoutData(
        this.searchQuery(), 
        this.mediaType(), 
        pagination
      );

      if (newResults.length < limit) {
        this.canLoadMore.set(false);
      }

      // add loading item to the end of results
      if (this.canLoadMore()) {
        newResults.push(undefined as any);
      }

      this.layoutData.update(current => {
        // delete loading item
        const base = current.filter(item => item !== undefined);

        // fill results
        if (isNextPage) {
          return [...base, ...newResults];
        }
        // change result
        return newResults;
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadApiData(isNextPage = false) {
    this.isLoading.set(true);

    // add loading item
    if (this.apiResults().length === 0) {
      this.apiResults.update(current => {
        return [...current, undefined as any];
      });
    }

    if (!isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);
    }

    try {
      let type = this.mediaType();
      let newResults = await this.apiService.search(
        this.searchQuery(), 
        type.type === 'SPECIFIC' ? type.value : MediaType.MOVIE,
        this.currentPage()
      );

      if (newResults.length < 20) {
        this.canLoadMore.set(false);
      }

      // add loading item to the end of results
      if (this.canLoadMore()) {
        newResults.push(undefined as any);
      }

      this.apiResults.update(current => {
        // delete loading item
        const base = current.filter(item => item !== undefined);

        // fill results
        if (isNextPage) {
          return [...base, ...newResults];
        }
        // change result
        return newResults;
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onScroll() {
    if (!this.isLoading() && this.canLoadMore()) {
      this.currentPage.update(p => p + 1);
      if (this.mode() === 'api') {
        this.loadApiData(true);
      }
      else {
        this.loadLibraryData(true);
      }
    }
  }

  onModeChange(mode : 'library' | 'api') {
    this.mode.set(mode);
  }

}
