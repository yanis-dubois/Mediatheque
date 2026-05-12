import { Component, DestroyRef, ElementRef, inject, output, signal, ViewChild } from '@angular/core';

import { CollectionsActionComponent } from "../collections-action/collections-action.component";
import { PinOrganizerComponent } from "@app/components/pin-organizer/pin-organizer.component";
import { MediaService } from '@app/services/media.service';
import { MediaEditingComponent } from "../media-editing/media-editing.component";
import { MediaDto } from '@app/models/media.model';

@Component({
  selector: 'app-home-action',
  standalone: true,
  imports: [CollectionsActionComponent, PinOrganizerComponent, MediaEditingComponent],
  templateUrl: './home-action.component.html'
})
export class HomeActionComponent {
  @ViewChild('pickerPopover') pickerPopover!: ElementRef<HTMLElement>;
  isPickerVisible = signal(false);

  openMenu = output<void>();
  closeMenu = output<void>();

  openPicker(event: MouseEvent) {
    this.openMenu.emit();
    event.stopPropagation();
    this.isPickerVisible.set(true);
    setTimeout(() => this.pickerPopover.nativeElement.showPopover());
  }

  async closePicker() {
    this.pickerPopover.nativeElement.classList.add('closing');
    await new Promise(resolve => setTimeout(resolve, 300));

    this.pickerPopover.nativeElement.hidePopover();
    this.pickerPopover.nativeElement.classList.remove('closing');
    this.isPickerVisible.set(false);
    this.closeMenu.emit();
  }

  mediaService = inject(MediaService);
  mediaId = signal<string | null>(null);
  async addMedia() {
    try {
      const id = await this.mediaService.addEmptyMedia();
      this.mediaId.set(id);
      this.openEditor();
    }
    catch (e) {
      console.error("Error while adding media :", e);
    }
  }

  @ViewChild('editorPopover') editorPopover!: ElementRef<HTMLElement>;
  isEditorVisible = signal(false);
  private destroyRef = inject(DestroyRef);
  private isDestroyed = false;
  constructor() {
    this.destroyRef.onDestroy(() => (this.isDestroyed = true));
  }
  openEditor() {
    this.isEditorVisible.set(true);
    setTimeout(() => this.editorPopover.nativeElement.showPopover());
  }
  async closeEditor() {
    this.editorPopover.nativeElement.classList.add('closing');
    await new Promise(resolve => setTimeout(resolve, 300));

    this.editorPopover.nativeElement.hidePopover();
    this.editorPopover.nativeElement.classList.remove('closing');
    this.isEditorVisible.set(false);

    if (!this.isDestroyed) {
      this.closeMenu.emit();
    }
  }
  async editMedia(media: MediaDto | null) {
    if (!media) return;

    try {
      await this.mediaService.editMedia(this.mediaId()!, media);
    } catch (e) {
      console.error("Error while editing media", e);
    }
  }

}
