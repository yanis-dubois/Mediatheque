import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { CollectionQuery } from '@models/collection-query.model';
import { Collection } from '@models/collection.model';
import { collectionLink } from '@helper/collection-routing'

import { PosterPathPipe } from '@pipe/image-path.pipe'

@Component({
  selector: 'app-collection-row',
  standalone: true,
  imports: [CommonModule, RouterModule, ScrollingModule, PosterPathPipe],
  templateUrl: './collection-row.component.html',
  styleUrl: './collection-row.component.css'
})
export class CollectionRowComponent {
  @Input({ required: true }) collection!: Collection;
  @Input({ required: true }) query!: CollectionQuery;
  @Input({ required: true }) loading!: boolean;

  collectionLink = collectionLink;

  trackByMediaId(media: any): number {
    return media.id;
  }
}
