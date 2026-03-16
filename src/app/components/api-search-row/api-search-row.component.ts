import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";
import { ApiSearchResult } from '@app/models/media.model';
import { MediaImageComponent } from "../media-image/media-image.component";
import { ImageService, ImageSize, ImageType } from '@app/services/image.service';

@Component({
  selector: 'app-api-search-row',
  standalone: true,
  imports: [CommonModule, EntityRowLayoutComponent, MediaImageComponent],
  templateUrl: './api-search-row.component.html',
  styleUrls: ['../../../style/entity-row.scss']
})
export class ApiSearchRowComponent {
  imageService = inject(ImageService);
  entity = input.required<ApiSearchResult>();
  height = input.required<number>();
  width = input.required<number>();
  source = computed(() => this.imageService.resolveUrl(
    this.entity().mediaType, 
    ImageType.POSTER, 
    this.entity().posterPath, 
    ImageSize.SMALL
  ));
  hasPoster = computed(() => {
    const media = this.entity();
    if (media.posterPath) return true;
    return false;
  });
  isMenuOpen = input.required<boolean>();
}
