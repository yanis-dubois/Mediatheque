import { Component, computed, ContentChild, effect, ElementRef, HostListener, inject, input, signal, TemplateRef, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { debounceTime, Subject, switchMap } from 'rxjs';
import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';

interface PositionedMedia {
  uniqueKey: string,
  id: string;
  width: number;
  height: number;
  x: number;
}

@Component({
  selector: 'app-collection-row',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-row.component.html',
  styleUrls: ['./collection-row.component.css']
})
export class CollectionRowComponent {
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;
  @ContentChild('itemRef') itemTemplate!: TemplateRef<any>;

  private entityService = inject(EntityService);

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();

  private scrollSubject = new Subject<string[]>();
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

    this.mediaLayoutData().forEach((data) => {
      const ratio = data[1] / data[2]; // width / height
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
        uniqueKey: `${data[0]}-${globalIndex++}`,
        id: data[0],
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
    onChange: (instance) => {
      this.syncVisibleMedia(instance.getVirtualItems());
    }
  }));

  private syncVisibleMedia(virtualRows: VirtualItem[]) {
    const visibleIds = virtualRows.flatMap(vRow => 
      this.rows()[vRow.index].map(item => item.id)
    );
  
    this.scrollSubject.next(visibleIds);
  }

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

    this.scrollSubject.pipe(
      debounceTime(100),
      switchMap(async (ids) => {
        // only gets the missing medias
        const missingIds = ids.filter(id => this.entityService.getMedia(id) === null);
        if (missingIds.length === 0) return [];

        try {
          // retrieve data
          return await this.entityService.loadBatch(EntityType.MEDIA, missingIds);
        } catch (e) {
          console.error("Batch load failed", e);
          return [];
        }
      })
    ).subscribe();
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
