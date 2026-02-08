import { Component, computed, effect, ElementRef, HostListener, inject, input, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { injectVirtualizer } from '@tanstack/angular-virtual';

import { Media } from '@models/media.model';

import { PosterPathPipe } from '@pipe/image-path.pipe'

@Component({
  selector: 'app-collection-column',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe],
  templateUrl: './collection-column.component.html',
  styleUrls: ['./collection-column.component.css']
})
export class CollectionColumnComponent {
  @Input({ required: true }) loading!: boolean;

  mediaList = input.required<Media[]>();

  @ViewChild('scrollElement') set scrollEl(content: ElementRef<HTMLElement>) {
    if (content) {
      this.scrollElement = content;
      this.containerWidth.set(content.nativeElement.offsetWidth);
    }
  }
  scrollElement!: ElementRef<HTMLElement>;

  private el = inject(ElementRef);

  minColumnWidth = signal(150);
  containerWidth = signal(0);

  columns = computed(() => {
    const width = this.containerWidth();
    const minWidth = this.minColumnWidth();
    const gap = 4;
    return Math.max(1, Math.floor(width / (minWidth + gap)));
  });

  columnWidth = computed(() => {
    const totalWidth = this.containerWidth();
    const nbCols = this.columns();
    const gap = 4;
    return (totalWidth - (gap * (nbCols - 1))) / nbCols;
  });

  getElementHeight(index: number) : number {
    const height = this.mediaList()[index].imageHeight;
    const width = this.mediaList()[index].imageWidth;
    const columnWidth = this.columnWidth() - 4;

    return (height * columnWidth) / width + 8;
  }

  virtualizer = injectVirtualizer(() => ({
    count: this.mediaList().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: (index: number) => {
      const extraSpace = 0; // for padding & other infos if added (title, ...)
      return this.getElementHeight(index) + extraSpace;
    },
    lanes: this.columns() || 1,
    enabled: !!this.scrollElement?.nativeElement,
  }));

  constructor() {
    effect(() => {
      const scrollEl = this.scrollElement?.nativeElement;
      if (this.virtualizer && scrollEl) {
        setTimeout(() => {
          this.virtualizer.measure();
        });
      }
    });
  }

  ngAfterViewInit() {
    this.updateDimensions();

    const ro = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      this.containerWidth.set(width);
      
      this.virtualizer.measure();
    });

    ro.observe(this.scrollElement.nativeElement);
  }

  @HostListener('window:resize')
  onResize() {
    this.updateDimensions();
  }

  private updateDimensions() {
    if (!this.scrollElement) return;

    const style = getComputedStyle(this.el.nativeElement);
    const cssWidth = style.getPropertyValue('--card-width-grid').trim();
  
    if (cssWidth) {
      this.minColumnWidth.set(parseInt(cssWidth, 10));
    }

    const width = this.scrollElement.nativeElement.clientWidth;
    if (width > 0) {
      this.containerWidth.set(width);
    }
  }
}
