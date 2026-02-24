import { Component, ContentChild, effect, ElementRef, HostListener, inject, input, Input, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { Collection } from '@models/collection.model';
import { Media } from '@models/media.model';

import { CollectionService } from '@services/collection.service';
import { MediaService } from '@app/services/media.service';

@Component({
  selector: 'app-collection-line',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-line.component.html',
  styleUrl: './collection-line.component.css'
})
export class CollectionLineComponent {
  @Input({ required: true }) collection!: Collection;
  @ContentChild('itemRef') itemTemplate!: TemplateRef<any>;
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  containerHeight = signal(0);

  protected getMediaLayout(index: number) {
    const data = this.mediaLayoutData()[index];
    if (!data) return {id: '', width: 0, height: 0};
    return { id: data[0], width: data[1], height: data[2] };
  }

  getElementWidth(index: number): number {
    const { width, height } = this.getMediaLayout(index);
    const lineHeight = this.containerHeight();

    // avoid dividing by 0
    if (!height || height === 0) return 200; 

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
    const cssWidth = style.getPropertyValue('--card-width-line').trim();

    if (cssWidth) {
      const height = parseInt(cssWidth, 10) * 1.5;
      this.containerHeight.set(height);
    }
  }
}
