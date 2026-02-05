import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Movie } from '@models/media-details.model';

import { DurationPipe } from '@pipe/duration.pipe';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [CommonModule, DurationPipe],
  templateUrl: './movie-details.component.html',
  styleUrl: './movie-details.component.css'
})
export class MovieDetailsComponent {
  @Input({ required: true }) movie!: Movie;
}
