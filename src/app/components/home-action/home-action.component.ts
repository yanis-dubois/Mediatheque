import { Component, DestroyRef, ElementRef, inject, output, signal, ViewChild } from '@angular/core';

import { CollectionsActionComponent } from "../collections-action/collections-action.component";
import { PinOrganizerComponent } from "@app/components/pin-organizer/pin-organizer.component";
import { AddMediaActionComponent } from "../add-media-action/add-media-action.component";

@Component({
  selector: 'app-home-action',
  standalone: true,
  imports: [CollectionsActionComponent, PinOrganizerComponent, AddMediaActionComponent],
  templateUrl: './home-action.component.html'
})
export class HomeActionComponent {
  @ViewChild('pickerPopover') pickerPopover!: ElementRef<HTMLElement>;
  isPickerVisible = signal(false);

  openMenu = output<void>();
  closeMenu = output<void>();

  private destroyRef = inject(DestroyRef);
  private isDestroyed = false;
  constructor() {
    this.destroyRef.onDestroy(() => (this.isDestroyed = true));
  }

  openPicker(event: MouseEvent) {
    this.openMenu.emit();
    event.stopPropagation();
    this.isPickerVisible.set(true);
    setTimeout(() => this.pickerPopover.nativeElement.showPopover());
  }

  async closePicker() {
    this.pickerPopover.nativeElement.classList.add('closing');
    await new Promise(resolve => setTimeout(resolve, 300));

    this.pickerPopover.nativeElement.hidePopover();
    this.pickerPopover.nativeElement.classList.remove('closing');
    this.isPickerVisible.set(false);
    if (!this.isDestroyed) {
      this.closeMenu.emit();
    }
  }

}
