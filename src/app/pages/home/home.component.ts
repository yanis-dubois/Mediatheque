import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionComponent } from '@components/collection/collection.component';
import { CollectionDisplayMode } from '@models/collection.model';
import { CollectionService } from '@services/collection.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  protected readonly CollectionDisplayMode = CollectionDisplayMode;

  collectionIds = signal<string[]>([]);

  constructor(
    private collectionService: CollectionService
  ) {}

}
