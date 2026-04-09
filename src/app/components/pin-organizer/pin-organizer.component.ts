import { Component, inject, output, signal } from '@angular/core';
import { Collection } from '@app/models/collection.model';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder } from '@angular/cdk/drag-drop';

import { EntityService } from '@app/services/entity.service';
import { NavService } from '@app/services/nav.service';
import { PinService } from '@app/services/pin.service';
import { GenericPickerComponent } from "../generic-picker/generic-picker.component";
import { EmojizePipe } from "../../pipe/emojize";

@Component({
  selector: 'app-pin-organizer',
  standalone: true,
  imports: [GenericPickerComponent, EmojizePipe, CdkDragPlaceholder, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './pin-organizer.component.html',
  styleUrls: ['./pin-organizer.component.scss'],
})
export class PinOrganizerComponent {
  private pinService = inject(PinService);
  private entityService = inject(EntityService);
  private navService = inject(NavService);

  onCancel = output<void>();
  onSave = output<void>();

  localPins = signal<Collection[]>([]);
  context = this.navService.context;

  constructor() {
    const ids = this.pinService.getPinnedIds(this.context());
    const collections = ids.map(id => this.entityService.getCollection(id)).filter(c => !!c) as Collection[];
    this.localPins.set(collections);
  }

  drop(event: CdkDragDrop<Collection[]>) {
    const newArray = [...this.localPins()];
    moveItemInArray(newArray, event.previousIndex, event.currentIndex);
    this.localPins.set(newArray);
  }

  async saveOrder() {
    const newOrderIds = this.localPins().map(c => c.id);

    try {
      await this.pinService.updatePinnedOrder(newOrderIds, this.context());
    } catch (e) {
      console.error("Error while updating pin order", e);
    }

    this.onSave.emit();
  }

}
