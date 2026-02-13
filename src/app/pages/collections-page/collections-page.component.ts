import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionComponent } from '@components/collection/collection.component';
import { ActionBarComponent } from '@components/action-bar/action-bar.component'

import { CollectionDisplayMode } from '@models/collection.model';
import { CollectionService } from '@services/collection.service';

@Component({
  selector: 'app-collections-page',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionComponent, ActionBarComponent],
  templateUrl: './collections-page.component.html',
  styleUrl: './collections-page.component.css'
})
export class CollectionsPageComponent {

  protected readonly CollectionDisplayMode = CollectionDisplayMode;

  collectionIds = signal<string[]>([]);

  constructor(
    private collectionService: CollectionService
  ) {}

  async ngOnInit() {
    try {
      const ids = await this.collectionService.getAllIds();
      this.collectionIds.set(ids);
    } catch (err) {
      console.error("Erreur lors de la récupération des IDs :", err);
    }
  }

}
