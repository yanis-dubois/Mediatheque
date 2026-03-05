import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CollectionType, ExternalCollection } from '@app/models/collection.model';
import { CollectionService } from '@app/services/collection.service';
import { NavService } from '@app/services/nav.service';
import { HumanizePipe } from "../../pipe/humanize";

@Component({
  selector: 'app-collections-action',
  standalone: true,
  templateUrl: './collections-action.component.html',
  imports: [HumanizePipe]
})
export class CollectionsActionComponent {

  private navService = inject(NavService);
  context = this.navService.context;
  private router = inject(Router);
  private collectionService = inject(CollectionService);

  async addCollection(isDynamic: boolean = false) {
    const newCollection: ExternalCollection = {
      collectionType: isDynamic 
        ? CollectionType.DYNAMIC 
        : CollectionType.MANUAL,
      mediaType: this.context()
    };

    try {
      let newCollectionId = await this.collectionService.createCollection(newCollection);
      this.router.navigate(['/collection', newCollectionId], { queryParams: { edit: 'true' } });
    } catch (e) {
      console.error(e);
    }
  }

}
