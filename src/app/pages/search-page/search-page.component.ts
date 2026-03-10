import { Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { SearchListComponent } from "@app/components/search-list/search-list.component";
import { EntityType } from '@app/models/entity.model';
import { EntityService } from '@app/services/entity.service';
import { debounceTime, Subject } from 'rxjs';
import { ApiSearchResult } from '@app/models/api.model';
import { ApiService } from '@app/services/api.service';
import { ApiSearchListComponent } from "@app/components/api-search-list/api-search-list.component";
import { MediaType } from '@app/models/media.model';
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
  apiResults = signal<ApiSearchResult[]>([]);
  isLoading = signal<boolean>(false);

  constructor(
    private entityService: EntityService,
    private apiService: ApiService
  ) {
    this.refreshInternetData$.pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.loadInternetData();
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

  private async loadInternetData() {
    this.isLoading.set(true);
    try {
      const results = await this.apiService.search(this.searchQuery(), this.mediaType());
      this.apiResults.set(results);
    } finally {
      this.isLoading.set(false);
    }
  }

  onModeChange(mode : 'library' | 'internet') {
    this.mode.set(mode);
  }

  onMediaTypeChange(newType: MediaType) {
    this.mediaType.set(newType);
  }

}
