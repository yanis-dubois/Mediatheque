import { Component, ElementRef, output, signal, ViewChild } from '@angular/core';

import { CollectionsActionComponent } from "../collections-action/collections-action.component";
import { PinOrganizerComponent } from "@app/components/pin-organizer/pin-organizer.component";

@Component({
  selector: 'app-home-action',
  standalone: true,
  imports: [CollectionsActionComponent, PinOrganizerComponent],
  templateUrl: './home-action.component.html'
})
export class HomeActionComponent {
  @ViewChild('pickerPopover') pickerPopover!: ElementRef<HTMLElement>;
  isPickerVisible = signal(false);

  openMenu = output<void>();
  closeMenu = output<void>();

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
    console.log('close Menu emit');
    this.closeMenu.emit();
  }

}
