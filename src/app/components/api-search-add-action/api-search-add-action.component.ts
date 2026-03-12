import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ApiService } from '@app/services/api.service';
import { ApiSearchResult } from '@app/models/media.model';

@Component({
  selector: 'app-api-search-add-action',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './api-search-add-action.component.html'
})
export class ApiSearchAddActionComponent {

  data = input.required<ApiSearchResult>();
  apiService = inject(ApiService);

  onAdd() {
    const data = this.data();
    if (data.isInLibrary)
      return;

    try {
      this.apiService.addMedia(data.externalId, data.mediaType);
      this.data().isInLibrary = true; 
    } catch (e) {
      console.error("Error while adding media", e);
    }
  }
}
