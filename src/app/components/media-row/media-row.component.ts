import { Component, computed, contentChild, ElementRef, inject, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PosterPathPipe } from '@pipe/image-path.pipe';
import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-media-row',
  standalone: true,
  imports: [CommonModule, PosterPathPipe, HumanizePipe, EmojizePipe],
  templateUrl: './media-row.component.html',
  styleUrls: ['./media-row.component.css']
})
export class MediaRowComponent {
  @Input({ required: true }) width! : number;
  @Input({ required: true }) height! : number;
  mediaId = input.required<string>();
  isMenuOpen = input.required<boolean>();

  customIcon = contentChild<ElementRef>('icon');

  private mediaService = inject(MediaService);

  media = computed(() => this.mediaService.getMediaSignal(this.mediaId())());
}
