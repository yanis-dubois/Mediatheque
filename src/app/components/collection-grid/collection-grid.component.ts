import { Component, computed, effect, ElementRef, HostListener, inject, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { injectVirtualizer } from '@tanstack/angular-virtual';

import { Collection } from '@models/collection.model';
import { Media } from '@models/media.model';

import { PosterPathPipe } from '@pipe/image-path.pipe'

@Component({
  selector: 'app-collection-grid',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe],
  templateUrl: './collection-grid.component.html',
  styleUrls: ['./collection-grid.component.css']
})
export class CollectionGridComponent {
  @Input({ required: true }) collection!: Collection;
  @Input({ required: true }) loading!: boolean;

  @ViewChild('scrollElement') set scrollEl(content: ElementRef<HTMLElement>) {
    if (content) {
      this.scrollElement = content;
      this.containerWidth.set(content.nativeElement.offsetWidth);
    }
  }
  scrollElement!: ElementRef<HTMLElement>;

  private el = inject(ElementRef);

  mediaList = signal<Media[]>([]); 
  minColumnWidth = signal(150);
  containerWidth = signal(0);

  columns = computed(() => {
    const width = this.containerWidth();
    const minWidth = this.minColumnWidth();
    const gap = 8;
    return Math.max(1, Math.floor(width / (minWidth + gap)));
  });

  columnWidth = computed(() => {
    const totalWidth = this.containerWidth();
    const nbCols = this.columns();
    const gap = 4;
    return (totalWidth - (gap * (nbCols - 1))) / nbCols;
  });

  virtualizer = injectVirtualizer(() => ({
    count: this.mediaList().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: (index: number) => {
      const width = this.columnWidth();
      const imageRatio = 1.5;
      const extraSpace = 0; // for padding & other infos if added (title, ...)

      return (width * imageRatio) + extraSpace;
    },
    lanes: this.columns() || 1,
    enabled: !!this.scrollElement?.nativeElement,
  }));

  constructor() {
    effect(() => {
      const cols = this.columns();
      const scrollEl = this.scrollElement?.nativeElement;
      if (this.virtualizer && scrollEl) {
        setTimeout(() => {
          this.virtualizer.measure();
        });
      }
    });
  }

  ngOnInit() {
    this.mediaList.set(this.collection.mediaList);
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
