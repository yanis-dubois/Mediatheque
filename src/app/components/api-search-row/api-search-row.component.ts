import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";
import { ApiSearchResult } from '@app/models/media.model';
import { MediaImageComponent } from "../media-image/media-image.component";
import { ImageService } from '@app/services/image.service';
import { ImageSize, ImageType } from '@app/models/image.model';
import { ExternalImagePathPipe } from "../../pipe/external-image.pipe";

@Component({
  selector: 'app-api-search-row',
  standalone: true,
  imports: [CommonModule, EntityRowLayoutComponent, MediaImageComponent, ExternalImagePathPipe],
  templateUrl: './api-search-row.component.html',
  styleUrls: ['../../../style/entity-row.scss']
})
export class ApiSearchRowComponent {
  imageService = inject(ImageService);
  entity = input.required<(ApiSearchResult | undefined)>();
  height = input.required<number>();
  width = input.required<number>();
  isMenuOpen = input.required<boolean>();

  hasPoster = computed(() => {
    const media = this.entity();
    if (media && media.posterPath) return true;
    return false;
  });

  protected readonly ImageType = ImageType;
  protected readonly ImageSize = ImageSize;
}
