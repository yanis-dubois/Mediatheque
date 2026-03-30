import { Component, computed, inject, input, signal } from '@angular/core';

import { MediaService } from '@app/services/media.service';
import { EntityService } from '@app/services/entity.service';
import { FavoriteActionComponent } from "../favorite-action/favorite-action.component";

@Component({
  selector: 'app-media-favorite-action',
  standalone: true,
  imports: [FavoriteActionComponent],
  templateUrl: './media-favorite-action.component.html',
  styleUrl: './media-favorite-action.component.scss'
})
export class MediaFavoriteActionComponent {

  mediaId = input.required<string>();

  private entityService = inject(EntityService);
  private mediaService = inject(MediaService);

  media = computed(() => {
    return this.entityService.getMedia(this.mediaId());
  });

  async toggleFavorite() {
    const media = this.media();
    if (!media) return;

    try {
      await this.mediaService.toggleFavorite(this.mediaId(), !media.favorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

}
