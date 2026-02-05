import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionService } from '@services/collection.service';
import { CollectionQuery } from '@models/collection-query.model';
import { Collection } from '@models/collection.model';

import { CollectionLineComponent } from '@components/collection-line/collection-line.component';
import { CollectionGridComponent } from '@components/collection-grid/collection-grid.component';
import { CollectionColumnComponent } from '@components/collection-column/collection-column.component';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionLineComponent, CollectionGridComponent, CollectionColumnComponent],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.css'
})
export class CollectionComponent {
  @Input({ required: true }) query!: CollectionQuery;
  @Input() view: 'grid' | 'row' | 'column' | 'line' = 'column';

  collection?: Collection;
  loading = true;
  error?: string;

  constructor(
    private collectionService: CollectionService
  ) {}

  async ngOnInit() {
    try {
      this.collection = await this.collectionService.getCollection(this.query);
    } catch (e) {
      console.error(e);
      this.error = 'Collection introuvable';
    } finally {
      this.loading = false;
    }
  }

  trackByMediaId(media: any): number {
    return media.id;
  }
}
