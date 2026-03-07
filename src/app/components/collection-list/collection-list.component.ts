import { Component, ContentChild, ElementRef, inject, input, signal, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { GenericListComponent } from "../generic-list/generic-list.component";
import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [CommonModule, RouterModule, GenericListComponent],
  templateUrl: './collection-list.component.html',
  styleUrls: ['./collection-list.component.css']
})
export class CollectionListComponent {
  @ContentChild('rowRef') rowTemplate!: TemplateRef<any>;

  private entityService = inject(EntityService);

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  containerHeight = signal(120);
  containerWidth = signal(100);

  protected onVisibleItemsChanged(visibleData: [string, number, number][]) {
    const visibleIds = visibleData.map(data => data[0]);

    const missingIds = visibleIds.filter(id => {
      return this.entityService.getMedia(id) === null;
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
        const missingIds = ids.filter(id => this.entityService.getMedia(id) === null);
        if (missingIds.length === 0) return [];

        try {
          // retrieve data
          return await this.entityService.loadBatch(EntityType.MEDIA, missingIds);
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
