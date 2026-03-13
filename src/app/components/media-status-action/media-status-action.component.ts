import { Component, computed, inject, input } from '@angular/core';

import { MediaStatus } from '@app/models/media.model';
import { MediaService } from '@app/services/media.service';
import { HumanizePipe } from "../../pipe/humanize";
import { EntityService } from '@app/services/entity.service';
import { getStatusColor } from '@app/models/media.model';

@Component({
  selector: 'app-media-status-action',
  standalone: true,
  imports: [HumanizePipe],
  templateUrl: './media-status-action.component.html',
  styleUrl: './media-status-action.component.scss'
})
export class MediaStatusActionComponent {

  mediaId = input.required<string>();

  statusOptions = Object.values(MediaStatus);
  getStatusColor = getStatusColor;

  private entityService = inject(EntityService);
  private mediaService = inject(MediaService);

  media = computed(() => {
    console.log(this.entityService.getMedia(this.mediaId()));
    return this.entityService.getMedia(this.mediaId());
  });

  async onStatusChange(newStatus: string) {
    const statusEnum = newStatus as MediaStatus;
    const media = this.media();
    if (!media) return;

    try {
      await this.mediaService.updateStatus(this.mediaId(), statusEnum);
    } catch (e) {
      console.error("Error while updating status", e);
    }
  }

}
