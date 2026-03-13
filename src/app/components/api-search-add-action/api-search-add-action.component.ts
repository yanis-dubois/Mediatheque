import { Component, inject, input, output } from '@angular/core';
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

  data = input.required<AnyApiMedia>();
  customClass = input<string>('dots-button dots-button-simple');
  onAdded = output<string>();

  async onAdd() {
    const data = this.data();
    if (data.isInLibrary)
      return;

    try {
      this.data().isInLibrary = true;
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
