import { Component, Input, signal } from '@angular/core';
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

  // media data needed for virtualizing (id, width, height)
  mediaLayoutData = signal<[string, number, number][]>([]);

  constructor(
    private collectionService: CollectionService
  ) {}

  async ngOnInit() {
    try {
      this.collection = await this.collectionService.getInfo(this.id);
      this.loadLayoutData();
      console.log("data loaded !!!");
    } catch (e) {
      console.error(e);
      this.error = 'Collection not found 😢';
    } finally {
      this.loading = false;
    }
  }

  async loadLayoutData() {
    this.mediaLayoutData.set(
      await this.collectionService.getLayoutData(this.id)
    );
  }

  trackByMediaId(media: any): number {
    return media.id;
  }
}
