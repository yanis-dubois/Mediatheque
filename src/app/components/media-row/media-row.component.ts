import { Component, computed, contentChild, ElementRef, inject, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PosterPathPipe } from '@pipe/image-path.pipe';
import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";
import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';

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
  display = input<string>('default');

  customIcon = contentChild<ElementRef>('icon');

  private entityService = inject(EntityService);
  protected readonly EntityType = EntityType;

  media = computed(() => {
    return this.entityService.getMedia(this.mediaId());
  });
}
