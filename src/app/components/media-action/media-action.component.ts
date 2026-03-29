import { Component, computed, EmbeddedViewRef, inject, input, output, Renderer2, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { Location } from '@angular/common';

import { ask } from '@tauri-apps/plugin-dialog';

import { MediaStatus } from '@app/models/media.model';
import { CollectionPickerComponent } from "../collection-picker/collection-picker.component";
import { DOCUMENT } from '@angular/common';
import { CollectionService } from '@app/services/collection.service';
import { EntityService } from '@app/services/entity.service';
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";
import { MediaService } from '@app/services/media.service';
import { Router } from '@angular/router';
import { NavService, PageType } from '@app/services/nav.service';

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

  deleteFromCollectionRequest = output<string>();
  deleteFromLibraryRequest = output<void>();

  statusOptions = Object.values(MediaStatus);

  private entityService = inject(EntityService);
  private collectionService = inject(CollectionService);
  private mediaService = inject(MediaService);
  private router = inject(Router);
  private location = inject(Location);
  private navService = inject(NavService);

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
    this.deleteFromCollectionRequest.emit(this.mediaId());
  }

  async onDeleteFromLibrary() {
    const media = this.media();
    if (!media) return;

    const id = this.mediaId();
    const name = media.title;
    const isInSearchPage = this.navService.page() === PageType.SEARCH;
    const isCurrentPage = this.router.url.includes(`/media/${id}`);

    const confirmed = await ask(
      `Are you sure you want to delete '${name}' from your library ?`, 
      { 
        title: 'Delete from Library',
        kind: 'warning',
        okLabel: 'Delete',
        cancelLabel: 'Keep',
      }
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.mediaService.delete(id);

      // if on /search/media page -> redirect to api version
      if (isInSearchPage && media.externalId) {
        this.router.navigate(['/search/media', media.externalId, media.mediaType, media.source, false], { 
          replaceUrl: true 
        });
      }
      // if on media page -> redirect back
      else if (isCurrentPage) {
        if (window.history.length > 1) {
          this.location.back();
        } 
        else {
          this.router.navigateByUrl('/', { 
            replaceUrl: true 
          });
        }
      }

      this.deleteFromLibraryRequest.emit();
    } catch (e) {
      console.error("Error during collection deletion", e);
    }
  }

  async refreshMediaData() {
    const media = this.media();
    if (!media || !media.externalId) return;

    await this.mediaService.refreshMediaData(
      media.id, media.externalId, media.mediaType, media.source
    );
  }

}
