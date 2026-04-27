import { Component, effect, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';

import { CollectionsVirtualizationComponent } from "@components/collections-virtual/collections-virtualization.component";
import { ActionBarComponent } from "@components/action-bar/action-bar.component";
import { DropdownComponent } from "@components/dropdown/dropdown.component";

import { CollectionService } from '@services/collection.service';
import { CollectionsActionComponent } from "@components/collections-action/collections-action.component";
import { CollectionMediaType } from '@app/models/collection.model';
import { HumanizePipe } from "../../pipe/humanize";
import { EntityService } from '@app/services/entity.service';
import { ScreenService } from '@app/services/screen.service';
import { collectionsPaginationLimit } from '@app/models/media-query.model';

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [CommonModule, CollectionsVirtualizationComponent, ActionBarComponent, DropdownComponent, CollectionsActionComponent, HumanizePipe],
  templateUrl: './collections.component.html',
  styleUrls: ['./collections.component.scss']
})
export class CollectionsComponent {
  context = input.required<CollectionMediaType>();
  collectionIds = signal<string[]>([]);

  private refreshLayout$ = new Subject<boolean>();

  searchQuery = signal<string>('');
  collectionCount = signal(0);

  isPageReady = signal(false);

  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  canLoadMore = signal<boolean>(true);

  constructor(
    private entityService: EntityService,
    private collectionService: CollectionService,
    private screenService: ScreenService
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
      this.searchQuery();
      this.context();
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
  }

  onScroll() {
    if (!this.isLoading() && this.canLoadMore()) {
      this.currentPage.update(p => p + 1);
      this.loadLayoutData(false, true);
    }
  }

  async loadLayoutData(isUpdate: boolean, isNextPage = false) {
    if (this.isLoading() || !this.isPageReady()) return;
    this.isLoading.set(true);

    // add loading item
    if (this.collectionIds().length === 0) {
      this.collectionIds.update(current => {
        return [...current, undefined as any];
      });
    }

    // reinit pagination if query has changed
    if (!isUpdate && !isNextPage) {
      this.currentPage.set(1);
      this.canLoadMore.set(true);
    }

    // 
    if (!isNextPage) {
      this.collectionCount.set(
        await this.collectionService.getCollectionCount(this.searchQuery(), this.context())
      );
    }

    const limit = collectionsPaginationLimit;
    const offset = (this.currentPage() - 1) * limit;
    const pagination = {
      limit: isUpdate ? this.currentPage()*limit : limit, 
      offset: isUpdate ? 0 : offset
    };
    let data = await this.collectionService.searchCollection(this.searchQuery(), this.context(), pagination);

    if (data.length < limit) {
      this.canLoadMore.set(false);
    }

    // add loading item to the end of results
    if (this.canLoadMore()) {
      data.push(undefined as any);
    }

    this.collectionIds.update(current => {
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
