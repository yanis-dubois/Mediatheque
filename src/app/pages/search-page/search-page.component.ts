import { Component, effect, signal } from '@angular/core';
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
import { HumanizePipe } from "../../pipe/humanize";

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionBarComponent, SearchListComponent, ApiSearchListComponent, HumanizePipe],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss'
})
export class SearchPageComponent {

  mediaTypeOptions = Object.values(MediaType);

  mode = signal<'library' | 'internet'>('library');
  mediaType = signal<MediaType>(MediaType.MOVIE);
  searchQuery = signal<string>('');

  private refreshLibraryData$ = new Subject<void>();
  layoutData = signal<[string, EntityType][]>([]);

  private refreshInternetData$ = new Subject<void>();
  apiResults = signal<(ApiSearchResult)[]>([]);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  canLoadMore = signal<boolean>(true);

  constructor(
    private entityService: EntityService,
    private apiService: ApiService
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
      this.mediaType();

      if (!query) {
        this.layoutData.set([]);
        this.apiResults.set([]);
        return;
      }

      if (this.mode() === 'library') 
        this.refreshLibraryData$.next();
      else this.refreshInternetData$.next();
    }, { allowSignalWrites: true });
  }

  async loadLibraryData() {
    this.layoutData.set(
      await this.entityService.getLayoutData(this.searchQuery())
    );
  }

  private async loadApiData(isNextPage = false) {
    this.isLoading.set(true);

    if (!isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);
    }

    try {
      let newResults = await this.apiService.search(
        this.searchQuery(), 
        this.mediaType(), 
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
    if (!this.isLoading() && this.mode() === 'internet' && this.canLoadMore()) {
      this.currentPage.update(p => p + 1);
      this.loadApiData(true);
    }
  }

  onModeChange(mode : 'library' | 'internet') {
    this.mode.set(mode);
  }

  onMediaTypeChange(newType: MediaType) {
    this.mediaType.set(newType);
  }

}
