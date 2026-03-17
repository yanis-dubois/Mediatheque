import { Component, computed, inject, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { getStatusColor } from '@app/models/media.model';
import { EntityService } from '@app/services/entity.service';
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";
import { MediaImageComponent } from "../media-image/media-image.component";
import { LocalImagePathPipe } from "../../pipe/local-image.pipe";
import { ImageSize, ImageType } from '@app/models/image.model';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, RouterModule, MediaStatusActionComponent, MediaFavoriteActionComponent, MediaImageComponent, LocalImagePathPipe],
  templateUrl: './media-card.component.html',
  styleUrls: ['./media-card.component.scss']
})
export class MediaCardComponent {
  @Input({ required: true }) width! : number;
  @Input({ required: true }) height! : number;
  mediaId = input.required<string>();
  isMenuOpen = input.required<boolean>();

  protected readonly ImageType = ImageType;
  protected readonly ImageSize = ImageSize;

  private entityService = inject(EntityService);
  getStatusColor = getStatusColor;

  media = computed(() => this.entityService.getMedia(this.mediaId()));
}
