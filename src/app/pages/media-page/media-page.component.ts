import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@components/action-bar/action-bar.component';
import { MediaDetailsComponent } from '@components/media-details/media-details.component';
import { MediaService } from '@app/services/media.service';
import { DetailedMedia } from '@app/models/media.model';

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [CommonModule, ActionBarComponent, MediaDetailsComponent],
  templateUrl: './media-page.component.html',
  styleUrl: './media-page.component.css'
})
export class MediaPageComponent {
  id?: string;
  error?: string;

  media = signal<DetailedMedia | null>(null);

  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService
  ) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error = 'Required id not specified';
      throw new Error(this.error);
    }

    this.id = id;
    this.media.set(
      await this.mediaService.getById(id)
    );
  }
}
