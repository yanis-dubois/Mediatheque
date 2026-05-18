import { Component, DestroyRef, ElementRef, inject, output, signal, ViewChild } from '@angular/core';

import { MediaService } from '@app/services/media.service';
import { MediaEditingComponent } from "../media-editing/media-editing.component";
import { MediaDto } from '@app/models/media.model';

@Component({
  selector: 'app-add-media-action',
  standalone: true,
  imports: [MediaEditingComponent],
  templateUrl: './add-media-action.component.html'
})
export class AddMediaActionComponent {
  openMenu = output<void>();
  closeMenu = output<void>();

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
  async deleteMedia() {
    try {
      const id = this.mediaId();
      if (id) {
        await this.mediaService.delete(id);
      }
    }
    catch (e) {
      console.error("Error while deleting media :", e);
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
    this.openMenu.emit();
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
