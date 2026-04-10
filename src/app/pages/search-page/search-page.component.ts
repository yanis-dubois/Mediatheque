import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { SearchListComponent } from "@app/components/search-list/search-list.component";
import { EntityService } from '@app/services/entity.service';
import { debounceTime, Subject } from 'rxjs';
import { ApiService } from '@app/services/api.service';
import { ApiSearchListComponent } from "@app/components/api-search-list/api-search-list.component";
import { MediaType } from '@app/models/media.model';
import { NavService } from '@app/services/nav.service';
import { CollectionLayout } from '@app/models/collection.model';
import { HumanizePipe } from "../../pipe/humanize";
import { getPaginationLimit } from '@app/models/media-query.model';
import { ScreenService } from '@app/services/screen.service';
import { SearchService } from '@app/services/search.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionBarComponent, SearchListComponent, ApiSearchListComponent, HumanizePipe],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss'
})
export class SearchPageComponent {

  searchService = inject(SearchService);
  mode = this.searchService.searchMode;
  mediaType = this.searchService.mediaType;
  searchQuery = this.searchService.searchQuery;
  librarySearchQuery = this.searchService.librarySearchQuery;
  apiSearchQuery = this.searchService.apiSearchQuery;
  layoutData = this.searchService.libraryResults;
  apiResults = this.searchService.apiResults;
  librarySearchPage = this.searchService.librarySearchPage;
  apiSearchPage = this.searchService.apiSearchPage;
  libraryCanLoadMore = this.searchService.libraryCanLoadMore;
  apiCanLoadMore = this.searchService.apiCanLoadMore;

  screenService = inject(ScreenService);
  isLoading = signal<boolean>(false);
  lastMode = signal<string>(this.mode());
  lastLibraryQuery = signal<string>(this.librarySearchQuery());
  lastApiQuery = signal<string>(this.apiSearchQuery());

  private refreshLibraryData$ = new Subject<void>();
  private refreshInternetData$ = new Subject<void>();

  context = computed(() => {
    return this.navService.context()
  });

  constructor(
    private entityService: EntityService,
    private apiService: ApiService,
    private navService: NavService
  ) {
    this.refreshInternetData$.pipe(
      debounceTime(500),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.loadApiData();
    });

    this.refreshLibraryData$.pipe(
      debounceTime(50),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.loadLibraryData();
    });

    effect(() => {
      const searchQuery = this.searchQuery();
      const mode = this.mode();
      if (mode === 'library') this.librarySearchQuery.set(searchQuery);
      else this.apiSearchQuery.set(searchQuery);
    }, { allowSignalWrites: true });

    effect(() => {
      this.entityService.lastUpdate();
      const query = this.librarySearchQuery();
      const ctx = this.navService.context();
      const mode = this.mode();
      let reload = false;

      if (mode === 'api') return;

      if (this.mediaType() !== ctx) {
        this.mediaType.set(ctx);
        this.resetLibraryResults();
        reload = true;
      }

      const hasEmptyQuery = !query || query.trim().length === 0;
      // reload data if query has changed
      if (this.lastLibraryQuery() !== query || (this.layoutData().length === 0 && hasEmptyQuery)) {
        this.lastLibraryQuery.set(query);
        this.resetLibraryResults();
        reload = true;
      }

      // load data only if needed
      if (reload) {
        this.refreshLibraryData$.next();
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const query = this.apiSearchQuery();
      const ctx = this.navService.context();
      const mode = this.mode();
      let reload = false;

      if (mode === 'library') return;

      if (this.mediaType() !== ctx) {
        this.mediaType.set(ctx);
        this.resetApiResults();
        reload = true;
      }

      const hasEmptyQuery = !query || query.trim().length === 0;
      // don't load data if there is no search query
      if (hasEmptyQuery) {
        this.resetApiResults();
        this.apiResults.set([]);
        return;
      } 
      // reload data if query has changed
      if (this.lastApiQuery() !== query) {
        this.lastApiQuery.set(query);
        this.resetApiResults();
        reload = true;
      }

      // load data only if needed
      if (reload) {
        this.refreshInternetData$.next();
      }
    }, { allowSignalWrites: true });
  }

  private resetLibraryResults() {
    this.librarySearchPage.set(1);
    this.libraryCanLoadMore.set(true);
  }
  private resetApiResults() {
    this.apiSearchPage.set(1);
    this.apiCanLoadMore.set(true);
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
      this.resetLibraryResults();
    }

    try {
      const limit = getPaginationLimit(this.screenService.size(), CollectionLayout.LIST);
      const pagination = {limit: limit, offset: (this.librarySearchPage() - 1) * limit};
      let newResults = await this.entityService.getLayoutData(
        this.librarySearchQuery(), 
        this.mediaType(), 
        pagination
      );

      if (newResults.length < limit) {
        this.libraryCanLoadMore.set(false);
      }

      // add loading item to the end of results
      if (this.libraryCanLoadMore()) {
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
      this.resetApiResults();
    }

    try {
      let type = this.mediaType();
      let newResults = await this.apiService.search(
        this.apiSearchQuery(), 
        type.type === 'SPECIFIC' ? type.value : MediaType.MOVIE,
        this.apiSearchPage()
      );

      if (newResults.length < 20) {
        this.apiCanLoadMore.set(false);
      }

      // add loading item to the end of results
      if (this.apiCanLoadMore()) {
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

  onScrollLibrary() {
    if (!this.isLoading() && this.libraryCanLoadMore()) {
      this.librarySearchPage.update(p => p + 1);
      this.loadLibraryData(true);
    }
  }

  onScrollApi() {
    if (!this.isLoading() && this.apiCanLoadMore()) {
      this.apiSearchPage.update(p => p + 1);
      this.loadApiData(true);
    }
  }

  onModeChange(mode : 'library' | 'api') {
    this.mode.set(mode);
  }

}
