import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Movie } from '@models/media-details.model';

import { DurationPipe } from '@pipe/duration.pipe';
import { MetadataType } from '@app/models/entity.model';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule, RouterModule, DurationPipe],
  templateUrl: './movie-details.component.html',
  styleUrl: './movie-details.component.css'
})
export class MovieDetailsComponent {
  @Input({ required: true }) movie!: Movie;
  protected readonly metadataType = MetadataType;
}
