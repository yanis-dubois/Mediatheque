import { Component, computed, inject, input } from '@angular/core';

import { EntityService } from '@app/services/entity.service';
import { CollectionService } from '@app/services/collection.service';

@Component({
  selector: 'app-collection-favorite-action',
  standalone: true,
  imports: [],
  templateUrl: './collection-favorite-action.component.html',
  styleUrl: './collection-favorite-action.component.scss'
})
export class CollectionFavoriteActionComponent {

  collectionId = input.required<string>();

  private entityService = inject(EntityService);
  private collectionService = inject(CollectionService);

  collection = computed(() => {
    return this.entityService.getCollection(this.collectionId());
  });

  async toggleFavorite() {
    const collection = this.collection();
    if (!collection) return;

    try {
      await this.collectionService.toggleFavorite(this.collectionId(), !collection.favorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

}
