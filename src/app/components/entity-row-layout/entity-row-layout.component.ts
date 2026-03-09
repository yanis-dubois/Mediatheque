import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-entity-row-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entity-row-layout.component.html',
  styleUrls: ['./entity-row-layout.component.scss']
})
export class EntityRowLayoutComponent {
  height = input.required<number>();
  listPadding = signal<number>(0);
  isMenuOpen = input<boolean>(false);

  private el = inject(ElementRef);

  ngAfterViewInit() {
    this.getPadding();
  }

  @HostListener('window:resize')
  onResize() {
    this.getPadding();
  }

  getPadding() {
    const style = getComputedStyle(this.el.nativeElement);
    const cssPadding = style.getPropertyValue('--list-padding').trim();
    if (cssPadding) {
      this.listPadding.set(parseInt(cssPadding, 10));
    }
  }
}
