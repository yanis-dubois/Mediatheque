import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Series } from '@models/media-details.model';

@Component({
  selector: 'app-serie-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './serie-details.component.html',
  styleUrl: './serie-details.component.css'
})
export class SerieDetailsComponent {
  @Input({ required: true }) serie!: Series;
}
