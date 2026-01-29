import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Collection } from '../models/collection';

@Component({
  selector: 'app-media-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-grid.component.html',
  styleUrls: ['./media-grid.component.css']
})
export class MediaGridComponent {
  @Input({ required: true }) collection!: Collection;
}