import { Component, computed, inject, input } from '@angular/core';

import { MediaPossessionStatus, MediaStatus } from '@app/models/media.model';
import { MediaService } from '@app/services/media.service';
import { HumanizePipe } from "../../pipe/humanize";
import { EntityService } from '@app/services/entity.service';
import { getPossessionStatusColor } from '@app/models/media.model';

@Component({
  selector: 'app-media-possession-status-action',
  standalone: true,
  imports: [HumanizePipe],
  templateUrl: './media-possession-status-action.component.html',
  styleUrl: './media-possession-status-action.component.scss'
})
export class MediaPossessionStatusActionComponent {

  mediaId = input.required<string>();

  statusOptions = Object.values(MediaPossessionStatus);
  getPossessionStatusColor = getPossessionStatusColor;

  private entityService = inject(EntityService);
  private mediaService = inject(MediaService);

  media = computed(() => {
    return this.entityService.getMedia(this.mediaId());
  });

  async onStatusChange(newStatus: string) {
    const statusEnum = newStatus as MediaPossessionStatus;
    const media = this.media();
    if (!media) return;

    try {
      await this.mediaService.updatePossessionStatus(this.mediaId(), statusEnum);
    } catch (e) {
      console.error("Error while updating status", e);
    }
  }

}
