import { Component, computed, inject, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PosterPathPipe } from '@pipe/poster-path.pipe';
import { getStatusColor } from '@app/models/media.model';
import { EntityService } from '@app/services/entity.service';
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe, MediaStatusActionComponent, MediaFavoriteActionComponent],
  templateUrl: './media-card.component.html',
  styleUrls: ['./media-card.component.scss']
})
export class MediaCardComponent {
  @Input({ required: true }) width! : number;
  @Input({ required: true }) height! : number;
  mediaId = input.required<string>();
  isMenuOpen = input.required<boolean>();

  private entityService = inject(EntityService);
  getStatusColor = getStatusColor;

  media = computed(() => this.entityService.getMedia(this.mediaId()));
}
