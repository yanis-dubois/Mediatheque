import { Component, ContentChild, ElementRef, inject, input, signal, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { GenericListComponent } from "../generic-list/generic-list.component";
import { CollectionService } from '@app/services/collection.service';
import { Collection } from '@app/models/collection.model';
import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';

@Component({
  selector: 'app-collections-list',
  standalone: true,
  imports: [CommonModule, RouterModule, GenericListComponent],
  templateUrl: './collections-list.component.html'
})
export class CollectionsListComponent {
  @ContentChild('rowRef') rowTemplate!: TemplateRef<any>;

  private entityService = inject(EntityService);

  // all collection id
  collectionIds = input.required<string[]>();

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  containerHeight = signal(120);
  containerWidth = signal(100);
  gap = signal(8);

  protected onVisibleItemsChanged(visibleIds: string[]) {

    const missingIds = visibleIds.filter(id => {
      return this.entityService.getCollection(id) === null;
    });

    if (missingIds.length > 0) {
      this.scrollSubject.next(missingIds);
    }
  }

  constructor() {
    this.scrollSubject.pipe(
      debounceTime(50),
      switchMap(async (ids) => {
        // only gets the missing medias
        const missingIds = ids.filter(id => this.entityService.getCollection(id) === null);
        if (missingIds.length === 0) return [];

        try {
          // retrieve data
          return await this.entityService.loadBatch(EntityType.COLLECTION, missingIds);
        } catch (e) {
          console.error("Batch load failed", e);
          return [];
        }
      })
    ).subscribe();
  }

  protected updateDimensions() {
    const style = getComputedStyle(this.el.nativeElement);
    const cssWidth = style.getPropertyValue('--card-width-list').trim();

    if (cssWidth) {
      const width = parseInt(cssWidth, 10);
      this.containerWidth.set(width);
      this.containerHeight.set(width * 1.5);
    }
  }
}
