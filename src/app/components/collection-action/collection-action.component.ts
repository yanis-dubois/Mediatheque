import { Component, computed, ElementRef, inject, input, output, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

import { CollectionType, CollectionMediaType } from '@app/models/collection.model';
import { CollectionService } from '@app/services/collection.service';
import { MediaPickerComponent } from "../media-picker/media-picker.component";
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
  @ViewChild('pickerPopover') pickerPopover!: ElementRef<HTMLElement>;
  isPickerVisible = signal(false);

  collectionId = input.required<string>();
  closeMenu = output<void>();
  private router = inject(Router);

  private entityService = inject(EntityService);
  private collectionService = inject(CollectionService);
  private pinService = inject(PinService);
  private location = inject(Location);

  protected readonly CollectionType = CollectionType;

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

  openPicker(event: MouseEvent) {
    event.stopPropagation();
    this.isPickerVisible.set(true);
    setTimeout(() => this.pickerPopover.nativeElement.showPopover());
  }

  closePicker() {
    this.pickerPopover.nativeElement.hidePopover();
    this.isPickerVisible.set(false);
    this.closeMenu.emit();
  }

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
      this.closeMenu.emit();
    } catch (e) {
      console.error("Error during collection deletion", e);
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
