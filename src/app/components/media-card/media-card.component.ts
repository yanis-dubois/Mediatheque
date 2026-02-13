import { Component, computed, effect, inject, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PosterPathPipe } from '@pipe/image-path.pipe';
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-media-card',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe],
  templateUrl: './media-card.component.html',
  styleUrls: ['./media-card.component.css']
})
export class MediaCardComponent {
  @Input({ required: true }) width! : number;
  @Input({ required: true }) height! : number;
  mediaId = input.required<string>();

  private mediaService = inject(MediaService);

  media = computed(() => this.mediaService.getMediaSignal(this.mediaId())());
  isMenuOpen = input.required<boolean>();
}
