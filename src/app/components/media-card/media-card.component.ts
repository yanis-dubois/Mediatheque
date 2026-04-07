import { Component, computed, effect, inject, input, Input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { getStatusColor } from '@app/models/media.model';
import { EntityService } from '@app/services/entity.service';
import { MediaImageComponent } from "../media-image/media-image.component";
import { ImageSize, ImageType } from '@app/models/image.model';
import { ImageService } from '@app/services/image.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MediaImageComponent],
  templateUrl: './media-card.component.html',
  styleUrls: ['./media-card.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class MediaCardComponent {
  @Input({ required: true }) width! : number;
  @Input({ required: true }) height! : number;
  mediaId = input.required<string>();
  isMenuOpen = input.required<boolean>();

  protected readonly ImageType = ImageType;
  protected readonly ImageSize = ImageSize;

  private entityService = inject(EntityService);
  private imageService = inject(ImageService);
  getStatusColor = getStatusColor;

  media = computed(() => this.entityService.getMedia(this.mediaId()));

  resolvedSrc = signal<string | null>(null);
  isImageLoaded = signal(false);
  hasLoaded = signal(false);

  async onImageReady() {
    const url = this.resolvedSrc();
    if (url) {
      await this.imageService.decode(url);
    }
    this.hasLoaded.set(true);
  }

  constructor() {
    effect(async () => {
      const currentMedia = this.media();
      const id = this.mediaId();
      
      untracked(() => {
        this.resolvedSrc.set(null);
        this.isImageLoaded.set(false);
      });

      if (currentMedia) {
        try {
          const url = await this.imageService.resolveLocalUrl(
            id, 
            currentMedia.mediaType, 
            currentMedia.source, 
            ImageType.POSTER, 
            ImageSize.MEDIUM
          );
          this.resolvedSrc.set(url);
        } catch (e) {
          console.error("Error while loading image", e);
        }
      }
    });
  }

}
