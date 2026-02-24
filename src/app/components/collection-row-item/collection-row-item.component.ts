import { Component, computed, contentChild, ElementRef, inject, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmojizePipe } from "@pipe/emojize";
import { CollectionService } from '@app/services/collection.service';

@Component({
  selector: 'app-collection-row-item',
  standalone: true,
  imports: [CommonModule, EmojizePipe],
  templateUrl: './collection-row-item.component.html',
  styleUrls: ['./collection-row-item.component.css']
})
export class CollectionRowItemComponent {
  @Input({ required: true }) width! : number;
  @Input({ required: true }) height! : number;
  collectionId = input.required<string>();
  isMenuOpen = input.required<boolean>();

  customIcon = contentChild<ElementRef>('icon');

  private collectionService = inject(CollectionService);

  collection = computed(() => this.collectionService.getCollectionSignal(this.collectionId())());
}
