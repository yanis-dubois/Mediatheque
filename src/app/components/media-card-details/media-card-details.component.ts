import { Component, computed, effect, ElementRef, inject, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { getStatusColor } from '@app/models/media.model';
import { EntityService } from '@app/services/entity.service';
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";
import { MediaImageComponent } from "../media-image/media-image.component";
import { ImageSize, ImageType } from '@app/models/image.model';
import { ImageService } from '@app/services/image.service';
import { MediaScoreActionComponent } from "../media-score-action/media-score-action.component";
import { animate, style, transition, trigger } from '@angular/animations';
import { MediaPossessionStatusActionComponent } from "../media-possession-status-action/media-possession-status-action.component";
import { SettingsService } from '@app/services/settings.service';
import { ScoreDisplayMode } from '@app/models/score.model';
import { MediaOwnership } from '@app/models/settings.model';

@Component({
  selector: 'app-media-card-details',
  standalone: true,
  imports: [CommonModule, RouterModule, MediaStatusActionComponent, MediaFavoriteActionComponent, MediaImageComponent, MediaScoreActionComponent, MediaPossessionStatusActionComponent],
  templateUrl: './media-card-details.component.html',
  styleUrls: ['./media-card-details.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class MediaCardDetailsComponent {
  mediaId = input.required<string>();
  isMenuOpen = input.required<boolean>();
  width = input.required<number>();

  posterWidth = signal(0);
  height = computed(() => (this.width() * 9) / 16);

  protected readonly ImageType = ImageType;
  protected readonly ImageSize = ImageSize;

  private el = inject(ElementRef);
  private entityService = inject(EntityService);
  private imageService = inject(ImageService);
  getStatusColor = getStatusColor;
  private settingsService = inject(SettingsService);
  showScore = this.settingsService.scoreDisplayMode() !== ScoreDisplayMode.HIDDEN;
  showMediaOwnership = this.settingsService.mediaOwnership() !== MediaOwnership.HIDDEN;

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
        const usePoster = !currentMedia.hasBackdrop && currentMedia.hasPoster;
        const imageType = usePoster ? ImageType.POSTER : ImageType.BACKDROP;
        const imageSize = usePoster ? ImageSize.MEDIUM : ImageSize.SMALL;

        try {
          const url = await this.imageService.resolveLocalUrl(
            id, 
            currentMedia.mediaType, 
            currentMedia.source, 
            imageType, 
            imageSize
          );
          this.resolvedSrc.set(url);
        } catch (e) {
          console.error("Error while loading image", e);
        }
      }
    });
  }

  ngAfterViewInit() {
    const style = getComputedStyle(this.el.nativeElement);
    const cssWidth = style.getPropertyValue('--card-width-detailed').trim();
    if (cssWidth) {
      this.posterWidth.set(parseInt(cssWidth, 10));
    }

    console.log('blap', this.width(), this.posterWidth(), this.height());
  }

}
