import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionLineComponent } from '@components/collection-line/collection-line.component';
import { CollectionDetailsComponent } from "@components/collection-details/collection-details.component";

import { Collection, CollectionDisplayMode } from '@models/collection.model';

import { CollectionService } from '@services/collection.service';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionLineComponent, CollectionDetailsComponent],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.css'
})
export class CollectionComponent {
  @Input({ required: true }) id!: string;
  @Input({ required: true }) view!: CollectionDisplayMode;

  protected readonly CollectionDisplayMode = CollectionDisplayMode;

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
