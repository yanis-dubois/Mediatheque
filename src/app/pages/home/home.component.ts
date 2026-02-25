import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionComponent } from '@components/collection/collection.component';
import { CollectionDisplayMode, CollectionMediaType } from '@models/collection.model';
import { DropdownComponent } from "@app/components/dropdown/dropdown.component";
import { CollectionActionComponent } from "@app/components/collection-action/collection-action.component";
import { PinService } from '@app/services/pin.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionComponent, DropdownComponent, CollectionActionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  @Input() context: CollectionMediaType = {type: 'ALL'};

  protected readonly CollectionDisplayMode = CollectionDisplayMode;

  collectionIds = this.pinService.getPinnedCollectionIds(this.context);

  activeMenuId = signal<string | null>(null);

  constructor(
    private pinService: PinService
  ) {}

  async loadLayoutData() {
    this.collectionIds = this.pinService.getPinnedCollectionIds(this.context);
  }

}
