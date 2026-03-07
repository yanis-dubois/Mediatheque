import { Component, ContentChild, DestroyRef, effect, ElementRef, HostListener, inject, input, output, signal, TemplateRef, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { injectVirtualizer } from '@tanstack/angular-virtual';

@Component({
  selector: 'app-generic-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-list.component.html',
  styleUrls: ['./generic-list.component.css']
})
export class GenericListComponent<T> {
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;
  @ContentChild('rowRef') rowTemplate!: TemplateRef<any>;

  items = input.required<T[]>();
  itemHeight = input.required<number>();
  listPadding = signal<number>(8);

  visibleItemsChanged = output<T[]>();
  windowResize = output();

  private el = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  private isDestroyed = false;

  virtualizer = injectVirtualizer(() => ({
    count: this.items().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: () => this.itemHeight() + (this.listPadding()*2),
    overscan: 5,
    onChange: (instance) => {
      if (this.isDestroyed) return;
      const visible = instance.getVirtualItems().map(v => this.items()[v.index]);
      this.visibleItemsChanged.emit(visible);
    }
  }));

  constructor() {
    effect(() => {
      this.items();
      untracked(() => this.virtualizer.measure());
    });

    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
    });
  }

  ngAfterViewInit() {
    this.windowResize.emit();
    const ro = new ResizeObserver(() => this.virtualizer.measure());
    ro.observe(this.scrollElement.nativeElement);
    this.getPadding();
  }

  @HostListener('window:resize')
  onResize() {
    this.windowResize.emit();

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
