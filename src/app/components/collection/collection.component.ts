import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionService } from '@services/collection.service';
import { Collection } from '@models/collection.model';

import { CollectionLineComponent } from '@components/collection-line/collection-line.component';
import { CollectionGridComponent } from '@components/collection-grid/collection-grid.component';
import { CollectionColumnComponent } from '@components/collection-column/collection-column.component';
import { CollectionRowComponent } from '@components/collection-row/collection-row.component';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionLineComponent, CollectionGridComponent, CollectionColumnComponent, CollectionRowComponent],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.css'
})
export class CollectionComponent {
  @Input({ required: true }) id!: string;
  @Input() view: 'line' | 'grid' | 'column' | 'row' = 'row';

  collection?: Collection;
  loading = true;
  error?: string;

  constructor(
    private collectionService: CollectionService
  ) {}

  async ngOnInit() {
    try {
      this.collection = await this.collectionService.getById(this.id);
    } catch (e) {
      console.error(e);
      this.error = 'Collection not found 😢';
    } finally {
      this.loading = false;
    }
  }

  trackByMediaId(media: any): number {
    return media.id;
  }
}
