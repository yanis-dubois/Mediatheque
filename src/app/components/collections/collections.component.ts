import { Component, effect, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';

import { CollectionsVirtualizationComponent } from "@components/collections-virtual/collections-virtualization.component";
import { ActionBarComponent } from "@components/action-bar/action-bar.component";
import { DropdownComponent } from "@components/dropdown/dropdown.component";

import { CollectionService } from '@services/collection.service';
import { CollectionsActionComponent } from "@components/collections-action/collections-action.component";
import { CollectionMediaType } from '@app/models/collection.model';

@Component({
  selector: 'app-collections',
  standalone: true,
  imports: [CommonModule, CollectionsVirtualizationComponent, ActionBarComponent, DropdownComponent, CollectionsActionComponent],
  templateUrl: './collections.component.html',
  styleUrls: ['./collections.component.scss']
})
export class CollectionsComponent {
  context = input.required<CollectionMediaType>();
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
        await this.collectionService.searchCollection(this.searchQuery(), this.context())
      );
    } catch (e) {
      console.error(e);
    }
  }

}
