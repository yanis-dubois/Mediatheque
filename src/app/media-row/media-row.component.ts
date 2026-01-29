import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Collection } from '../models/collection';

@Component({
  selector: 'app-media-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-row.component.html',
  styleUrl: './media-row.component.css'
})
export class MediaRowComponent {
  @Input({ required: true }) collection!: Collection;
}
