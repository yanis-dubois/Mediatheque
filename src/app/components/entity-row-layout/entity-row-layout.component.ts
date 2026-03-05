import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-entity-row-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entity-row-layout.component.html',
  styleUrls: ['./entity-row-layout.component.css']
})
export class EntityRowLayoutComponent {
  height = input.required<number>();
  gap = input<number>(0);
  isMenuOpen = input<boolean>(false);
}
