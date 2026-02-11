import { Component, ContentChild, effect, ElementRef, HostListener, inject, input, Input, output, signal, TemplateRef, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { Media } from '@models/media.model';

import { CollectionService } from '@services/collection.service';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-list.component.html',
  styleUrls: ['./collection-list.component.css']
})
export class CollectionListComponent {
  @Input({ required: true }) loading!: boolean;
  @Input() selectionMode = false;

  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  @ContentChild('rowRef') rowTemplate!: TemplateRef<any>;

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();
  // media currently visible in the virtualizer
  protected visibleMediaMap = signal<Record<string, Media>>({});

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  containerHeight = signal(100);
  containerWidth = signal(100);

  protected getMediaLayout(index: number) {
    const data = this.mediaLayoutData()[index];
    return { id: data[0], width: data[1], height: data[2] };
  }

  virtualizer = injectVirtualizer(() => ({
    count: this.mediaLayoutData().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: () => {
      const gap = 8;
      return this.containerHeight() + gap;
    },
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
      const scrollEl = this.scrollElement?.nativeElement;
      if (this.virtualizer && scrollEl) {
        setTimeout(() => {
          this.virtualizer.measure();
        });
      }
    });

    effect(() => {
      this.mediaLayoutData();
      untracked(() => {
        if (this.virtualizer) {
          this.virtualizer.scrollToOffset(0); 
          this.virtualizer.measure();
        }
      });
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
    const cssWidth = style.getPropertyValue('--card-width-list').trim();

    if (cssWidth) {
      const width = parseInt(cssWidth, 10);
      this.containerWidth.set(width);
      this.containerHeight.set(width * 1.5);
    }
  }
}
