import { Component, computed, inject, input, output } from '@angular/core';
import { MediaStatus } from '@app/models/media.model';
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-media-action',
  standalone: true,
  imports: [],
  templateUrl: './media-action.component.html',
  styleUrl: './media-action.component.css'
})
export class MediaActionComponent {

  mediaId = input.required<string>();
  canDeleteFromCollection = input<boolean>(false);

  deleteRequest = output<string>();

  statusOptions = Object.values(MediaStatus);

  private mediaService = inject(MediaService);
  
  media = computed(() => 
    this.mediaService.getMediaSignal(this.mediaId())()
  );

  async toggleFavorite() {
    const media = this.media();
    if (!media) return;

    try {
      await this.mediaService.toggleFavorite(this.mediaId(), !media.favorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

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

  onDelete() {
    this.deleteRequest.emit(this.mediaId());
  }

}
