import { Component, ContentChild, effect, ElementRef, HostListener, inject, input, Input, output, signal, TemplateRef, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { Media } from '@models/media.model';

import { CollectionService } from '@services/collection.service';
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-collection-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-list.component.html',
  styleUrls: ['./collection-list.component.css']
})
export class CollectionListComponent {
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;
  @ContentChild('rowRef') rowTemplate!: TemplateRef<any>;

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();

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

    const missingIds = visibleIds.filter(id => {
      return this.mediaService.getMediaSignal(id)() === null;
    });

    if (missingIds.length > 0) {
      this.scrollSubject.next(missingIds);
    }
  }

  constructor(
    private mediaService: MediaService,
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

    const ro = new ResizeObserver(() => {
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
