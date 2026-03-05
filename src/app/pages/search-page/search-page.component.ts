import { Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { SearchListComponent } from "@app/components/search-list/search-list.component";
import { EntityType } from '@app/models/entity.model';
import { EntityService } from '@app/services/entity.service';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionBarComponent, SearchListComponent],
  templateUrl: './search-page.component.html'
})
export class SearchPageComponent { 

  layoutData = signal<[string, EntityType][]>([]);
  searchQuery = signal<string>('');
  private refreshLayout$ = new Subject<void>();

  constructor(
    private entityService: EntityService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(50)
    ).subscribe(() => {
      this.loadLayoutData();
    });

    effect(() => {
      this.searchQuery();
      this.entityService.lastUpdate();
      this.refreshLayout$.next();
    });
  }

  async loadLayoutData() {
    this.layoutData.set(
      await this.entityService.getLayoutData(this.searchQuery())
    );
  }

}
