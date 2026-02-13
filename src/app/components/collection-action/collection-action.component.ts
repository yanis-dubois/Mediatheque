import { Component, computed, inject, input, output } from '@angular/core';
import { CollectionService } from '@app/services/collection.service';

@Component({
  selector: 'app-collection-action',
  standalone: true,
  imports: [],
  templateUrl: './collection-action.component.html',
  styleUrl: './collection-action.component.css'
})
export class CollectionActionComponent {

  collectionId = input.required<string>();

  deleteRequest = output<string>();

  private collectionService = inject(CollectionService);

  collection = computed(() => 
    this.collectionService.getCollectionSignal(this.collectionId())()
  );

  async toggleFavorite() {
    const collection = this.collection();
    if (!collection) return;

    try {
      await this.collectionService.toggleFavorite(this.collectionId(), !collection.favorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

  onDelete() {
    this.collectionService.delete(this.collectionId());
  }

}
