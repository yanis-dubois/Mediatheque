import { Component, input, output, TemplateRef, ViewChild } from '@angular/core';

import { DropdownTriggerDirective } from '@app/directive/dropdown.directive'

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [DropdownTriggerDirective],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss'
})
export class DropdownComponent {
  @ViewChild('menuTemplate') menuTemplate!: TemplateRef<any>;

  customClass = input<string>('dots-button dots-button-simple');
  isOpenExternal = input.required<boolean>();

  opened = output<void>();
  closed = output<void>();

}
