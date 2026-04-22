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
  navHeight = signal<number>(50);

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
    overscan: 10,
    paddingEnd: this.navHeight(),
    onChange: (instance) => {
      if (this.isDestroyed) return;

      const virtualItems = instance.getVirtualItems();
      if (virtualItems.length === 0) return;

      const lastItemIndex = virtualItems[virtualItems.length - 1].index;
      if (lastItemIndex >= this.items().length - 1) {
        this.triggerCooldown();
      }

      const visible = virtualItems.map(v => this.items()[v.index]);
      this.visibleItemsChanged.emit(visible);
    }
  }));

  endReached = output<void>();
  private readonly COOLDOWN_TIME = 500;
  private triggerCooldown() {
    setTimeout(() => {
      this.endReached.emit();
    }, this.COOLDOWN_TIME);
  }

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
    this.virtualizer.measure();
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

    const cssNavHeight = style.getPropertyValue('--nav-height').trim();
    if (cssNavHeight) {
      this.navHeight.set(parseInt(cssNavHeight, 10));
    }
  }
}
