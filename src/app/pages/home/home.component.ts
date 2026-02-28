import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder } from '@angular/cdk/drag-drop';

import { CollectionComponent } from '@components/collection/collection.component';
import { CollectionDisplayMode } from '@models/collection.model';
import { DropdownComponent } from "@app/components/dropdown/dropdown.component";
import { CollectionActionComponent } from "@app/components/collection-action/collection-action.component";
import { PinService } from '@app/services/pin.service';
import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { CollectionsActionComponent } from "@app/components/collections-action/collections-action.component";
import { NavService } from '@app/services/nav.service copy';
import { HumanizePipe } from "../../pipe/humanize";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionComponent, DropdownComponent, CollectionActionComponent, ActionBarComponent, CollectionsActionComponent, CdkDragPlaceholder, CdkDropList, CdkDrag, CdkDragHandle, HumanizePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  protected readonly CollectionDisplayMode = CollectionDisplayMode;

  context = this.navService.context;
  collectionIds = computed(() => {
    return this.pinService.getPinnedIds(this.context());
  });

  activeMenuId = signal<string | null>(null);

  constructor(
    private navService: NavService,
    private pinService: PinService
  ) {
    effect(() => {
      this.collectionIds();
    });
  }

  async drop(event: CdkDragDrop<string[]>) {
    const newOrder = [...this.collectionIds()];
    moveItemInArray(newOrder, event.previousIndex, event.currentIndex);

    try {
      await this.pinService.updatePinnedOrder(newOrder, this.context());
    } catch (e) {
      console.error("Error while updating pin order", e);
      this.pinService.refresh();
    }
  }

}
