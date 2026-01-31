import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Collection } from '@models/collection';

@Component({
  selector: 'app-collection-grid',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-grid.component.html',
  styleUrls: ['./collection-grid.component.css']
})
export class CollectionGridComponent {
  @Input({ required: true }) collection!: Collection;
  @Input({ required: true }) loading!: boolean;
}
