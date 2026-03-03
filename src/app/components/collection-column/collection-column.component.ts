import { Component, computed, ContentChild, effect, ElementRef, HostListener, inject, input, signal, TemplateRef, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { Media } from '@models/media.model';

import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-collection-column',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-column.component.html',
  styleUrls: ['./collection-column.component.css']
})
export class CollectionColumnComponent {
  @ContentChild('itemRef') itemTemplate!: TemplateRef<any>;
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();

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
    if (!data) return {id: '', width: 0, height: 0};
    return { id: data[0], width: data[1], height: data[2] };
  }

  getElementHeight(index: number): number {
    const { width, height } = this.getMediaLayout(index);
    const columnWidth = this.columnWidth();

    if (!height || height === 0) return 150;
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

    const missingIds = visibleIds.filter(id => {
      return this.mediaService.getMediaSignal(id)() === null;
    });

    if (missingIds.length > 0) {
      this.scrollSubject.next(missingIds);
    }
  }

  constructor(
    private mediaService: MediaService
  ) {
    effect(() => {
      this.mediaLayoutData().length;
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
        const missingIds = ids.filter(id => this.mediaService.getMediaSignal(id)() === null);
        if (missingIds.length === 0) return [];

        try {
          // retrieve data
          return await this.mediaService.getMediaBatch(missingIds);
        } catch (e) {
          console.error("Batch load failed", e);
          return [];
        }
      })
    ).subscribe((medias: Media[]) => {
      // fill the cache
      medias.forEach(m => this.mediaService.setMedia(m));
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
