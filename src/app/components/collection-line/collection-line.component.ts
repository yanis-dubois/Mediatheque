import { Component, effect, ElementRef, HostListener, inject, input, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { Collection } from '@models/collection.model';

import { PosterPathPipe } from '@pipe/image-path.pipe'
import { Media } from '@app/models/media.model';
import { debounceTime, Subject, switchMap } from 'rxjs';
import { CollectionService } from '@app/services/collection.service';

@Component({
  selector: 'app-collection-line',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe],
  templateUrl: './collection-line.component.html',
  styleUrl: './collection-line.component.css'
})
export class CollectionLineComponent {
  @Input({ required: true }) collection!: Collection;
  @Input({ required: true }) loading!: boolean;

  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();
  // media currently visible in the virtualizer
  protected visibleMediaMap = signal<Record<string, Media>>({});

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  containerHeight = signal(0);

  protected getMediaLayout(index: number) {
    const data = this.mediaLayoutData()[index];
    return { id: data[0], width: data[1], height: data[2] };
  }

  getElementWidth(index: number): number {
    const { width, height } = this.getMediaLayout(index);
    const lineHeight = this.containerHeight();

    if (!height || height === 0) return 200; // Fallback

    return (width * lineHeight) / height;
  }

  virtualizer = injectVirtualizer(() => ({
    count: this.mediaLayoutData().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement.nativeElement || null,
    estimateSize: (index: number) => {
      const gap = 8; // for padding & other infos if added (title, ...)
      return this.getElementWidth(index) + gap;
    },
    horizontal: true,
    overscan: 5,
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
      const data = this.mediaLayoutData();
      const scrollEl = this.scrollElement?.nativeElement;
      if (data.length > 0 && this.virtualizer && scrollEl) {
        setTimeout(() => {
          this.virtualizer.measure();
          this.syncVisibleMedia(this.virtualizer.getVirtualItems());
        });
      }
    });

    this.scrollSubject.pipe(
      // wait for the scroll to be more stable
      debounceTime(50),
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
    const cssWidth = style.getPropertyValue('--card-width-line').trim();

    if (cssWidth) {
      const height = parseInt(cssWidth, 10) * 1.5;
      this.containerHeight.set(height);
    }
  }
}
