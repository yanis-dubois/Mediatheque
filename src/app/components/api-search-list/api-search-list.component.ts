import { Component, ContentChild, effect, ElementRef, inject, input, output, signal, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { GenericListComponent } from "../generic-list/generic-list.component";
import { ApiSearchResult } from '@app/models/media.model';
import { ApiSearchRowComponent } from "../api-search-row/api-search-row.component";
import { ApiSearchActionComponent } from "../api-search-action/api-search-action.component";
import { Subscription } from 'rxjs';
import { EntityService } from '@app/services/entity.service';

@Component({
  selector: 'app-api-search-list',
  standalone: true,
  imports: [CommonModule, RouterModule, GenericListComponent, ApiSearchRowComponent, ApiSearchActionComponent],
  templateUrl: './api-search-list.component.html'
})
export class ApiSearchListComponent {
  @ContentChild('rowRef') rowTemplate!: TemplateRef<any>;

  layoutData = input.required<(ApiSearchResult)[]>();
  enrichedData = signal<(ApiSearchResult)[]>([]);

  private el = inject(ElementRef);
  private entityService = inject(EntityService);
  private subscription = new Subscription();

  containerHeight = signal(120);
  containerWidth = signal(100);
  gap = signal(8);
  hasBeenAdded = signal<boolean>(false);

  endReached = output<void>();

  constructor() {
    effect(() => {
      this.enrichedData.set(this.layoutData());
    }, { allowSignalWrites: true });
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

  ngOnInit() {
    this.subscription.add(
      this.entityService.mediaInserted$.subscribe((media) => {
        this.enrichedData.update(items => 
          items.map(item => {

            if (item && item.externalId.toString() === media.externalId?.toString()) {
              return { ...item, id: media.id, isInLibrary: true };
            }
            return item;
          })
        );
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}
