import { Component, computed, effect, ElementRef, HostListener, inject, input, Input, signal, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { injectVirtualizer } from '@tanstack/angular-virtual';

import { Media } from '@models/media.model';

import { PosterPathPipe } from '@pipe/image-path.pipe'

interface PositionedMedia {
  uniqueKey: string,
  media: Media;
  x: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-collection-row',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe],
  templateUrl: './collection-row.component.html',
  styleUrls: ['./collection-row.component.css']
})
export class CollectionRowComponent {
  @Input({ required: true }) loading!: boolean;
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  mediaList = input.required<Media[]>();

  private el = inject(ElementRef);

  rowHeight = signal(150*1.5);
  containerWidth = signal(0);
  private gap = 8;

  rows = computed(() => {
    const lines: PositionedMedia[][] = [];
    const containerWidth = this.containerWidth();
    let currentLine: PositionedMedia[] = [];
    let currentLineWidth = 0;
    const gap = this.gap;
    let globalIndex = 0;

    this.mediaList().forEach((media) => {
      const ratio = media.imageWidth / media.imageHeight;
      const width = this.rowHeight() * ratio;

      // if that image can't fit
      if (currentLineWidth + width > containerWidth && currentLine.length > 0) {
        // calculate the scaling factor to fill the blanks
        const totalGaps = (currentLine.length - 1) * gap;
        const availableWidth = containerWidth - totalGaps;
        const scalingFactor = availableWidth / (currentLineWidth - totalGaps);

        // apply it
        let xOffset = 0;
        currentLine.forEach(item => {
          item.width = item.width * scalingFactor;
          item.height = this.rowHeight() * scalingFactor;
          item.x = xOffset;
          xOffset += item.width + gap;
        });

        lines.push(currentLine);
        currentLine = [];
        currentLineWidth = 0;
      }

      currentLine.push({
        uniqueKey: `${media.id}-${globalIndex++}`,
        media,
        width: width,
        height: this.rowHeight(),
        x: currentLineWidth,
      });

      currentLineWidth += width + gap;
    });

    // last line that won't be justified
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  });

  virtualizer = injectVirtualizer(() => ({
    count: this.rows().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement.nativeElement,
    estimateSize: (index: number) => {
      let height = this.rowHeight();
      const item = this.rows()[index][0];
      if (item) 
        height = item.height;
      return height + this.gap;
    },
  }));

  constructor() {
    effect(() => {
      this.rows().length;
      this.containerWidth();
      
      untracked(() => {
        if (this.virtualizer && this.scrollElement?.nativeElement) {
          requestAnimationFrame(() => {
            this.virtualizer.measure();
          });
        }
      });
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
      const height = parseInt(cssWidth, 10) * 1.5;
      this.rowHeight.set(height);
    }

    const width = this.scrollElement.nativeElement.clientWidth;
    if (width > 0) {
      this.containerWidth.set(width);
    }
  }
}
