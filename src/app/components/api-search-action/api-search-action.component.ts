import { Component, inject, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ask } from '@tauri-apps/plugin-dialog';

import { ApiService } from '@app/services/api.service';
import { AnyApiMedia, isDetailedMedia } from '@app/models/media.model';
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-api-search-action',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './api-search-action.component.html'
})
export class ApiSearchActionComponent {
  apiService = inject(ApiService);
  mediaService = inject(MediaService);

  data = model.required<AnyApiMedia>();
  customClass = input<string>('dots-button dots-button-simple');
  beforeAdded = output<void>();
  beforeRemove = output<void>();
  onAdded = output<string>();

  async onClick() {
    const data = this.data();

    if (data.isInLibrary) {
      this.remove(data);
      return;
    }

    this.add(data);
  }

  async add(data: AnyApiMedia) {
    try {
      this.data.set({...data, isInLibrary: true});
      this.beforeAdded.emit();
      if (isDetailedMedia(data)) {
        const id = await this.mediaService.addToLibrary(data);
        this.onAdded.emit(id);
      } 
      else {
        await this.apiService.addMedia(data.externalId, data.mediaType, data.source);
      }
    } catch (e) {
      console.error("Error while adding media", e);
    }
  }

  async remove(data: AnyApiMedia) {
    if (!data.id) return;

    const id = data.id;
    const name = data.title;

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
      this.beforeRemove.emit();
      await this.mediaService.delete(id, data.externalId);
      this.data.set({...data, isInLibrary: false});
    } catch (e) {
      console.error("Error during collection deletion", e);
    }
  }

}
