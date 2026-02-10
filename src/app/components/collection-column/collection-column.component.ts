import { Component, computed, effect, ElementRef, HostListener, inject, input, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { Media } from '@models/media.model';

import { PosterPathPipe } from '@pipe/image-path.pipe'
import { CollectionService } from '@services/collection.service';

@Component({
  selector: 'app-collection-column',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe],
  templateUrl: './collection-column.component.html',
  styleUrls: ['./collection-column.component.css']
})
export class CollectionColumnComponent {
  @Input({ required: true }) loading!: boolean;

  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();
  // media currently visible in the virtualizer
  protected visibleMediaMap = signal<Record<string, Media>>({});

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

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
    const gap = 8;
    return (totalWidth - (gap * (nbCols))) / nbCols;
  });

  protected getMediaLayout(index: number) {
    const data = this.mediaLayoutData()[index];
    return { id: data[0], width: data[1], height: data[2] };
  }

  getElementHeight(index: number): number {
    const { width, height } = this.getMediaLayout(index);
    const columnWidth = this.columnWidth();

    if (!height || height === 0) return 150; // Fallback

    return (height * columnWidth) / width;
  }

  virtualizer = injectVirtualizer(() => ({
    count: this.mediaLayoutData().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: (index: number) => {
      const extraSpace = 8; // for padding & other infos if added (title, ...)
      return this.getElementHeight(index) + extraSpace;
    },
    lanes: this.columns() || 1,
    enabled: !!this.scrollElement?.nativeElement,
    onChange: (instance) => {
      this.syncVisibleMedia(instance.getVirtualItems());
    }
  }));

  private syncVisibleMedia(virtualItems: VirtualItem[]) {
    const visibleIds = virtualItems.map(vItem => this.getMediaLayout(vItem.index).id);

    // load cache
    const cachedMedia: Record<string, Media> = {};
    let hasMissing = false;

    visibleIds.forEach(id => {
      const media = this.collectionService.getCachedMedia(id);
      if (media) {
        cachedMedia[id] = media;
      } else {
        hasMissing = true;
      }
    });

    if (Object.keys(cachedMedia).length > 0) {
      this.visibleMediaMap.update(current => ({ ...current, ...cachedMedia }));
    }

    // load media that are not in cache
    if (hasMissing) {
      this.scrollSubject.next(visibleIds);
    }
  }

  constructor(
    private collectionService: CollectionService
  ) {
    effect(() => {
      const scrollEl = this.scrollElement?.nativeElement;
      if (this.virtualizer && scrollEl) {
        setTimeout(() => {
          this.virtualizer.measure();
        });
      }
    });

    this.scrollSubject.pipe(
      // wait for the scroll to be more stable
      debounceTime(100),
      // avoid last request if a new one is here
      switchMap(async (ids) => {
        const media = await this.collectionService.getMediaBatch(ids);
        return { ids, media };
      })
    ).subscribe(({ media }) => {
      this.visibleMediaMap.update(current => {
        const next = { ...current };
        media.forEach(m => next[m.id] = m);
        return next;
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
      this.minColumnWidth.set(parseInt(cssWidth, 10));
    }

    const width = this.scrollElement.nativeElement.clientWidth;
    if (width > 0) {
      this.containerWidth.set(width);
    }
  }
}
