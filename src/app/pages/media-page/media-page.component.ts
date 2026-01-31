import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@app/components/action-bar/action-bar.component';
import { MediaService } from '@services/media.service';
import { Media } from '@models/media'

@Component({
  selector: 'app-collection-page',
  standalone: true,
  imports: [CommonModule, ActionBarComponent],
  templateUrl: './media-page.component.html',
  styleUrl: './media-page.component.css'
})
export class MediaPageComponent {
  media?: Media;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private mediaService: MediaService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!isNaN(id)) {
      this.mediaService.getById(id)
        .then(media => this.media = media)
        .catch(() => this.media = undefined);
    }
  }
}
