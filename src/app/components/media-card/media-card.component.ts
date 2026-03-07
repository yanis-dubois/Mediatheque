import { Component, computed, inject, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PosterPathPipe } from '@pipe/image-path.pipe';
import { getStatusColor } from '@app/models/media.model';
import { EntityService } from '@app/services/entity.service';
import { EmojizePipe } from "../../pipe/emojize";
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe, EmojizePipe, MediaStatusActionComponent],
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
