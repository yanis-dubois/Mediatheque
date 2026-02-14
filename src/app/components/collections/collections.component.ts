import { Component, effect, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';

import { CollectionsVirtualizationComponent } from "@components/collections-virtual/collections-virtualization.component";

import { CollectionService } from '@services/collection.service';

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [CommonModule, CollectionsVirtualizationComponent],
  templateUrl: './collections.component.html',
  styleUrls: ['./collections.component.scss']
})
export class CollectionsComponent {

  collectionIds = signal<string[]>([]);

  private refreshLayout$ = new Subject<void>();

  searchQuery = signal<string>('');

  constructor(
    private collectionService: CollectionService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(100)
    ).subscribe(() => {
      this.loadLayoutData();
      console.log("blip :"+this.collectionIds.length);
    });

    effect(() => {
      this.collectionService.lastUpdate(); 

      untracked(() => {
        this.refreshLayout$.next();
      });
    });

    effect(async () => {
      this.searchQuery()
      this.refreshLayout$.next();
    });
  }

  async ngOnInit() {
    this.loadLayoutData();
  }

  async loadLayoutData() {
    try {
      this.collectionIds.set(
        await this.collectionService.getCollectionsData(this.searchQuery())
      );
    } catch (e) {
      console.error(e);
    }
  }
}
