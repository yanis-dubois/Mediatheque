import { Component, computed, contentChild, ElementRef, inject, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmojizePipe } from "@pipe/emojize";
import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';
import { Collection } from '@app/models/collection.model';
import { HumanizePipe } from "../../pipe/humanize";

@Component({
  selector: 'app-collection-row-item',
  standalone: true,
  imports: [CommonModule, EmojizePipe, HumanizePipe],
  templateUrl: './collection-row-item.component.html',
  styleUrls: ['./collection-row-item.component.css']
})
export class CollectionRowItemComponent {
  @Input({ required: true }) width! : number;
  @Input({ required: true }) height! : number;
  collectionId = input.required<string>();
  isMenuOpen = input.required<boolean>();
  display = input<string>('default');

  customIcon = contentChild<ElementRef>('icon');

  private entityService = inject(EntityService);
  protected readonly EntityType = EntityType;

  collection = computed(() => {
    return this.entityService.getCollection(this.collectionId());
  });
}
