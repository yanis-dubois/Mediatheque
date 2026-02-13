import { Component, computed, inject, input, model, output } from '@angular/core';
import { Media } from '@app/models/media.model';
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
  canDelete = input<boolean>(false);

  deleteRequest = output<string>();

  private mediaService = inject(MediaService);
  
  media = computed(() => 
    this.mediaService.getMediaSignal(this.mediaId())()
  );

  async toggleFavorite() {
    const current = this.media();
    if (current) {
      await this.mediaService.toggleFavorite(current.id, !current.favorite);
    }
  }

  onDelete() {
    this.deleteRequest.emit(this.mediaId());
  }

}
