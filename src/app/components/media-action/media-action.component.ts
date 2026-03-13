import { Component, computed, EmbeddedViewRef, inject, input, output, Renderer2, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { MediaStatus } from '@app/models/media.model';
import { CollectionPickerComponent } from "../collection-picker/collection-picker.component";
import { DOCUMENT } from '@angular/common';
import { CollectionService } from '@app/services/collection.service';
import { EntityService } from '@app/services/entity.service';
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-media-action',
  standalone: true,
  imports: [CollectionPickerComponent, MediaStatusActionComponent, MediaFavoriteActionComponent],
  templateUrl: './media-action.component.html'
})
export class MediaActionComponent {
  @ViewChild('pickerTemplate') pickerTemplate!: TemplateRef<any>;

  private viewContainerRef = inject(ViewContainerRef);
  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);
  private embeddedView: EmbeddedViewRef<any> | null = null;

  mediaId = input.required<string>();
  canDeleteFromCollection = input<boolean>(false);
  onReloaded = output<string>();

  deleteRequest = output<string>();

  statusOptions = Object.values(MediaStatus);

  private entityService = inject(EntityService);
  private collectionService = inject(CollectionService);
  private mediaService = inject(MediaService);

  media = computed(() => {
    return this.entityService.getMedia(this.mediaId());
  });

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

  async addToSelectedCollection(collectionIds: Set<string>) {
    if (collectionIds.size < 1) return;

    try {
      await this.collectionService.addMediaToCollectionBatch(this.mediaId(), collectionIds);
    } catch (e) {
      console.error("Error while adding media to collection", e);
    }
  }

  onDeleteFromCollection() {
    this.deleteRequest.emit(this.mediaId());
  }

  async refreshMediaData() {
    const media = this.media();
    if (!media || !media.externalId) return;

    await this.mediaService.refreshMediaData(
      media.id, media.externalId, media.mediaType
    );
    this.onReloaded.emit(media.id);
  }

}
