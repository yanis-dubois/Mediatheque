import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
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
  private router = inject(Router);

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

  async onDelete() {
    const id = this.collectionId();
    const isCurrentPage = this.router.url.includes(`/collection/${id}`);

    try {
      await this.collectionService.delete(id);

      // if on collection page -> redirect back
      if (isCurrentPage) {
        this.router.navigate(['/collections'], { replaceUrl: true });
      }
    } catch (e) {
      console.error("Error during collection deletion", e);
    }
  }

}
