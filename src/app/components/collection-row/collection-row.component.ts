import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionQuery } from '@models/collectionQuery';
import { Collection } from '@models/collection';
import { collectionLink } from '@helper/collection-routing'

@Component({
  selector: 'app-collection-row',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-row.component.html',
  styleUrl: './collection-row.component.css'
})
export class CollectionRowComponent {
  @Input({ required: true }) collection!: Collection;
  @Input({ required: true }) query!: CollectionQuery;
  @Input({ required: true }) loading!: boolean;

  collectionLink = collectionLink;
}
