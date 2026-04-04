import { Component, computed, ContentChild, ElementRef, inject, input, signal, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, EMPTY, mergeMap, Subject } from 'rxjs';

import { GenericListComponent } from "../generic-list/generic-list.component";
import { EntityType } from '@app/models/entity.model';
import { EntityService } from '@app/services/entity.service';
import { MediaRowComponent } from "../media-row/media-row.component";
import { CollectionRowItemComponent } from "../collection-row-item/collection-row-item.component";
import { DropdownComponent } from "../dropdown/dropdown.component";
import { MediaActionComponent } from "../media-action/media-action.component";
import { CollectionActionComponent } from "../collection-action/collection-action.component";
import { PersonRowComponent } from "../person-row/person-row.component";
import { CompanyRowComponent } from "../company-row/company-row.component";
import { GenreRowComponent } from "../tag-row/genre-row.component";
import { GameMechanicRowComponent } from "../tag-row/game-mechanic-row.component";
import { SagaRowComponent } from "../saga-row/saga-row.component";
import { NavService } from '@app/services/nav.service';

@Component({
  selector: 'app-search-list',
  standalone: true,
  imports: [CommonModule, RouterModule, GenericListComponent, MediaRowComponent, CollectionRowItemComponent, DropdownComponent, MediaActionComponent, CollectionActionComponent, PersonRowComponent, CompanyRowComponent, GenreRowComponent, GameMechanicRowComponent, SagaRowComponent],
  templateUrl: './search-list.component.html',
  styleUrls: ['./search-list.component.css']
})
export class SearchListComponent {
  @ContentChild('rowRef') rowTemplate!: TemplateRef<any>;

  // all data infos (id, entityType)
  layoutData = input.required<[string, EntityType][]>();

  private loadSubject = new Subject<{ type: EntityType, ids: string[] }>();
  private el = inject(ElementRef);

  protected readonly EntityType = EntityType;

  containerHeight = signal(120);
  containerWidth = signal(100);
  gap = signal(8);
  activeMenuId = signal<string | null>(null);
  context = computed(() => {
    const ctx = this.navService.context();
    if (ctx.type === 'SPECIFIC') {
      return ctx.value;
    }
    return 'ALL';
  });

  protected onVisibleItemsChanged(visibleData: [string, EntityType][]) {
    // create dictionnary { 'media': ['id1', 'id2'], 'collection': ['id3'] }
    const missingByEntityType = visibleData.reduce((acc, [id, type]) => {
      const currentSignal = this.entityService.getEntitySignal(type, id);
      
      if (currentSignal() === null) {
        if (!acc[type]) acc[type] = [];
        acc[type].push(id);
      }
      return acc;
    }, {} as Record<EntityType, string[]>);
  
    // send each groups to loadSubject
    Object.entries(missingByEntityType).forEach(([type, ids]) => {
      if (ids.length > 0) {
        this.loadSubject.next({ type: type as EntityType, ids });
      }
    });
  }

  constructor(
    protected entityService: EntityService,
    private navService: NavService
  ) {
    this.loadSubject.pipe(
      debounceTime(50),
      // launch a load for each type independently
      mergeMap(async ({ type, ids }) => {
        const missingIds = ids.filter(id => this.entityService.getEntitySignal(type, id)() === null);
        if (missingIds.length === 0) return EMPTY;

        try {
          // retrieve data
          return await this.entityService.loadBatch(type, missingIds);
        } catch (e) {
          console.error("Batch load failed", e);
          return EMPTY;
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
