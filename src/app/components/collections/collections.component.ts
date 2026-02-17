import { Component, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';

import { CollectionsVirtualizationComponent } from "@components/collections-virtual/collections-virtualization.component";
import { ActionBarComponent } from "@components/action-bar/action-bar.component";
import { DropdownComponent } from "@components/dropdown/dropdown.component";

import { CollectionService } from '@services/collection.service';
import { CollectionType, ExternalCollection } from '@app/models/collection.model';
import { MediaType } from '@app/models/media.model';

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [CommonModule, CollectionsVirtualizationComponent, ActionBarComponent, DropdownComponent],
  templateUrl: './collections.component.html',
  styleUrls: ['./collections.component.scss']
})
export class CollectionsComponent {

  collectionIds = signal<string[]>([]);

  private router = inject(Router);
  private refreshLayout$ = new Subject<void>();

  searchQuery = signal<string>('');

  constructor(
    private collectionService: CollectionService
  ) {
    this.refreshLayout$.pipe(
      debounceTime(100)
    ).subscribe(() => {
      this.loadLayoutData();
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
        await this.collectionService.getCollectionsIds(this.searchQuery())
      );
    } catch (e) {
      console.error(e);
    }
  }

  async addCollection (isDynamic: boolean = false, mediaType?: MediaType) {
    const newCollection: ExternalCollection = {
      collectionType: isDynamic 
        ? CollectionType.DYNAMIC 
        : CollectionType.MANUAL,
      mediaType: mediaType 
        ? {type: "SPECIFIC", value: mediaType} 
        : {type: "ALL"}
    };

    try {
      let newCollectionId = await this.collectionService.createCollection(newCollection);
      this.router.navigate(['/collection', newCollectionId], { queryParams: { edit: 'true' } });
    } catch (e) {
      console.error(e);
    }
  }
}
