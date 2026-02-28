import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { CollectionsComponent } from '@components/collections/collections.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CollectionMediaType } from '@app/models/collection.model';
import { MediaType } from '@app/models/media.model';
import { NavService } from '@app/services/nav.service copy';

@Component({
  selector: 'app-collections-page',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionsComponent],
  templateUrl: './collections-page.component.html',
  styleUrl: './collections-page.component.css'
})
export class CollectionsPageComponent { 

  context = this.navService.context;

  constructor (private navService: NavService) {}

}
