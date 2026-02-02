import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@components/action-bar/action-bar.component';
import { MediaDetailsComponent } from '@components/media-details/media-details.component';

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [CommonModule, ActionBarComponent, MediaDetailsComponent],
  templateUrl: './media-page.component.html',
  styleUrl: './media-page.component.css'
})
export class MediaPageComponent {
  id?: number;
  error?: string;

  constructor(
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    console.info(this.id);

    if (!this.id) {
      this.error = 'Required id not specified';
    }
    else if (isNaN(this.id)) {
      this.error = `Invalid media id : ${this.id}`;
    }

    if (this.error) {
      throw new Error(this.error);
    }
  }
}
