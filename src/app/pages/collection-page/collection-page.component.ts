import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@components/action-bar/action-bar.component';
import { CollectionComponent } from '@components/collection/collection.component';

import { CollectionQuery, CollectionQueryType } from '@models/collection-query.model';
import { pathToMediaType, pathToStatus } from '@models/media.model';

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

    switch (type as CollectionQueryType) {
      case 'all':
        return {
          type: CollectionQueryType.ALL
        };

      case 'simple':
        return {
          type: CollectionQueryType.SIMPLE,
          id: Number(value)
        };

      case 'favorite':
        return {
          type: CollectionQueryType.FAVORITE
        };

      case 'recent':
        if (!value) {
          return {
            type: CollectionQueryType.RECENT
          };
        }

        const val = Number(value);
        if (isNaN(val)) {
          this.error = true;
          throw new Error(`Invalid limit value: ${value}`);
        }

        return {
          type: CollectionQueryType.RECENT,
          limit: val
        };

      case 'media-type':
        if (!value) {
          this.error = true;
          throw new Error(`Invalid status value: ${value}`);
        }

        return {
          type: CollectionQueryType.MEDIA_TYPE,
          mediaType: pathToMediaType(value)
        };

      case 'status':
        if (!value) {
          this.error = true;
          throw new Error(`Invalid status value: ${value}`);
        }

        return {
          type: CollectionQueryType.STATUS,
          status: pathToStatus(value)
        };

      default:
        this.error = true;
        throw new Error(`Unknown collection route: ${type}`);
    }
  }
}
