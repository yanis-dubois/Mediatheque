import { Component, computed, EmbeddedViewRef, inject, input, output, Renderer2, signal, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

import { CollectionType, CollectionMediaType } from '@app/models/collection.model';
import { CollectionService } from '@app/services/collection.service';
import { MediaPickerComponent } from "../media-picker/media-picker.component";
import { DOCUMENT } from '@angular/common';
import { PinService } from '@app/services/pin.service';
import { HumanizePipe } from "../../pipe/humanize";
import { EntityService } from '@app/services/entity.service';
import { CollectionFavoriteActionComponent } from "../collection-favorite-action/collection-favorite-action.component";

@Component({
  selector: 'app-collection-action',
  standalone: true,
  imports: [MediaPickerComponent, HumanizePipe, CollectionFavoriteActionComponent],
  templateUrl: './collection-action.component.html'
})
export class CollectionActionComponent {
  @ViewChild('pickerTemplate') pickerTemplate!: TemplateRef<any>;

  private viewContainerRef = inject(ViewContainerRef);
  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);
  private embeddedView: EmbeddedViewRef<any> | null = null;

  collectionId = input.required<string>();
  deleteRequest = output<void>();
  private router = inject(Router);

  private entityService = inject(EntityService);
  private collectionService = inject(CollectionService);
  private pinService = inject(PinService);
  private location = inject(Location);

  collection = computed(() => 
    this.entityService.getCollection(this.collectionId())
  );

  // for pins
  isPinnedGlobal = computed(() => 
    this.pinService.isPinned(this.collectionId(), {type: 'ALL'})
  );
  isPinnedSpecific = computed(() => {
    const col = this.collection();
    if (!col) return false;
    return this.pinService.isPinned(this.collectionId(), col.mediaType);
  });
  hasSpecificContext = computed(() => {
    const col = this.collection();
    if (col) {
      if (col.mediaType.type === 'SPECIFIC')
        return col.mediaType.value;
    }
    return null;
  });

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

  async togglePin(context: CollectionMediaType) {
    try {
      this.pinService.togglePin(this.collectionId(), context);
    } catch (e) {
      console.error(`Error toggling pin for context ${context}`, e);
    }
  }

  async onDelete() {
    const id = this.collectionId();
    const isCurrentPage = this.router.url.includes(`/collection/${id}`);

    try {
      await this.collectionService.delete(id);

      // if on collection page -> redirect back
      if (isCurrentPage) {
        if (window.history.length > 1) {
          this.location.back();
        } else {
          this.router.navigateByUrl('/', { replaceUrl: true });
        }
      }
      this.deleteRequest.emit();
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
