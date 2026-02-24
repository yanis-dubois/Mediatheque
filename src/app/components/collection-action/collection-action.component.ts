import { Component, computed, EmbeddedViewRef, inject, input, output, Renderer2, signal, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { Router } from '@angular/router';
import { CollectionType } from '@app/models/collection.model';
import { CollectionService } from '@app/services/collection.service';
import { MediaPickerComponent } from "../media-picker/media-picker.component";
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-collection-action',
  standalone: true,
  imports: [MediaPickerComponent],
  templateUrl: './collection-action.component.html'
})
export class CollectionActionComponent {
  @ViewChild('pickerTemplate') pickerTemplate!: TemplateRef<any>;

  private viewContainerRef = inject(ViewContainerRef);
  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);
  private embeddedView: EmbeddedViewRef<any> | null = null;

  collectionId = input.required<string>();
  private router = inject(Router);

  deleteRequest = output<string>();

  private collectionService = inject(CollectionService);

  collection = computed(() => 
    this.collectionService.getCollectionSignal(this.collectionId())()
  );

  protected readonly CollectionType = CollectionType;

  showPicker = signal(false);

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

  openPicker(event: MouseEvent) {
    event.stopPropagation();
    if (this.embeddedView) return;

    // attach picker to body
    this.embeddedView = this.viewContainerRef.createEmbeddedView(this.pickerTemplate);
    this.embeddedView.rootNodes.forEach(node => {
      this.renderer.appendChild(this.document.body, node);
    });

    this.embeddedView.detectChanges();
  }

  closePicker() {
    if (this.embeddedView) {
      this.embeddedView.destroy();
      this.embeddedView = null;
    }
  }

  async addSelectedMedia(newMediaIds: Set<string>) {
    if (newMediaIds.size < 1) return;

    try {
      await this.collectionService.addMediaBatchToCollection(this.collectionId(), newMediaIds);
    } catch (e) {
      console.error("Error while adding media to collection", e);
    }
  }

  ngOnDestroy() {
    this.closePicker();
  }

}
