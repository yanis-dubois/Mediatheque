import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@app/components/action-bar/action-bar.component';
import { CollectionComponent } from '@app/components/collection/collection.component';
import { CollectionQuery, CollectionQueryType } from '@models/collectionQuery';

@Component({
  selector: 'app-collection-page',
  standalone: true,
  imports: [CommonModule, ActionBarComponent, CollectionComponent],
  templateUrl: './collection-page.component.html',
  styleUrl: './collection-page.component.css'
})
export class CollectionPageComponent {
  query?: CollectionQuery;
  error = false;

  constructor(
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.query = this.buildQueryFromRoute();
  }

  private buildQueryFromRoute(): CollectionQuery {
    const type = this.route.snapshot.paramMap.get('type');
    const value = this.route.snapshot.paramMap.get('value');

    switch (type) {
      case 'all':
        return {
          type: CollectionQueryType.ALL
        };

      case 'simple':
        return {
          type: CollectionQueryType.SIMPLE,
          id: Number(value)
        };

      case 'tag':
        return {
          type: CollectionQueryType.TAG,
          tag: value!
        };

      default:
        this.error = true;
        throw new Error(`Unknown collection route: ${type}`);
    }
  }
}
