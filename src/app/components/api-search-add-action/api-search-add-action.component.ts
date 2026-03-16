import { Component, inject, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ApiService } from '@app/services/api.service';
import { AnyApiMedia, isDetailedMedia } from '@app/models/media.model';
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-api-search-add-action',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './api-search-add-action.component.html'
})
export class ApiSearchAddActionComponent {
  apiService = inject(ApiService);
  mediaService = inject(MediaService);

  data = model.required<AnyApiMedia>();
  customClass = input<string>('dots-button dots-button-simple');
  beforeAdded = output<void>();
  onAdded = output<string>();

  async onAdd() {
    const data = this.data();
    if (data.isInLibrary)
      return;

    try {
      this.data.set({...data, isInLibrary: true});
      this.beforeAdded.emit();
      if (isDetailedMedia(data)) {
        const id = await this.mediaService.addToLibrary(data);
        this.onAdded.emit(id);
      } 
      else {
        await this.apiService.addMedia(data.externalId, data.mediaType);
      }
    } catch (e) {
      console.error("Error while adding media", e);
    }
  }
}
