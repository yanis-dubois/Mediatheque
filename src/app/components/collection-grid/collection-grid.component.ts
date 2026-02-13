import { Component, computed, ContentChild, effect, ElementRef, HostListener, inject, input, Input, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { Media } from '@models/media.model';

import { CollectionService } from '@services/collection.service';
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-collection-grid',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-grid.component.html',
  styleUrls: ['./collection-grid.component.css']
})
export class CollectionGridComponent {
  @Input({ required: true }) loading!: boolean;
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;
  @ContentChild('itemRef') itemTemplate!: TemplateRef<any>;

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
    return { id: data[0], width: data[1], height: data[2] };
  }

  virtualizer = injectVirtualizer(() => ({
    count: this.mediaLayoutData().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: () => {
      const width = this.columnWidth();
      const imageRatio = 1.5;
      const extraSpace = 8; // for padding & other infos if added (title, ...)

      return (width * imageRatio) + extraSpace;
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
    private mediaService: MediaService,
    private collectionService: CollectionService
  ) {
    effect(() => {
      const cols = this.columns();
      const scrollEl = this.scrollElement?.nativeElement;
      if (this.virtualizer && scrollEl) {
        setTimeout(() => {
          this.virtualizer.measure();
        });
      }
    });

    this.scrollSubject.pipe(
      debounceTime(100),
      switchMap(async (ids) => {
        // only gets the missing medias
        const missingIds = ids.filter(id => this.mediaService.getMediaSignal(id)() === null);
        if (missingIds.length === 0) return [];

        try {
          // retrieve data
          return await this.collectionService.getMediaBatch(missingIds);
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
