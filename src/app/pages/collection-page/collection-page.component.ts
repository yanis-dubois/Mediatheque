import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@components/action-bar/action-bar.component';
import { CollectionComponent } from '@components/collection/collection.component';

@Component({
  selector: 'app-collection-page',
  standalone: true,
  imports: [CommonModule, ActionBarComponent, CollectionComponent],
  templateUrl: './collection-page.component.html',
  styleUrl: './collection-page.component.css'
})
export class CollectionPageComponent {
  id?: string;
  error?: string;

  constructor(
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    console.info(id);

    if (!id) {
      this.error = 'Required id not specified';
      throw new Error(this.error);
    }

    this.id = id;
  }

}
