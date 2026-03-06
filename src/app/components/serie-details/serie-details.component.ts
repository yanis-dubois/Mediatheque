import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Series } from '@models/media-details.model';
import { MetadataType } from '@app/models/entity.model';

@Component({
  selector: 'app-serie-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './serie-details.component.html',
  styleUrl: './serie-details.component.css'
})
export class SerieDetailsComponent {
  @Input({ required: true }) serie!: Series;
  protected readonly metadataType = MetadataType;
}
