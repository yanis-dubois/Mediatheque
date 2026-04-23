import { Component, computed, ContentChild, effect, ElementRef, HostListener, inject, input, Input, output, signal, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, delay, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { Collection, CollectionType } from '@models/collection.model';
import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-collection-line',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-line.component.html',
  styleUrl: './collection-line.component.scss'
})
export class CollectionLineComponent {
  @Input({ required: true }) collection!: Collection;
  @ContentChild('itemRef') itemTemplate!: TemplateRef<any>;
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  private entityService = inject(EntityService);

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();

  protected readonly CollectionType = CollectionType;
  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  containerHeight = signal(0);
  sideMargin = signal(8);

  protected getMediaLayout(index: number) {
    const data = this.mediaLayoutData()[index];
    if (!data) return {id: '', width: 0, height: 0};
    return { id: data[0], width: data[1], height: data[2] };
  }

  getElementWidth(index: number): number {
    const { width, height } = this.getMediaLayout(index);
    const lineHeight = this.containerHeight();

    // avoid dividing by 0 (2/3 ratio by default)
    if (!height || height === 0) return (2 * lineHeight) / 3; 

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
    overscan: 2,
    scrollMargin: this.sideMargin(),
    paddingEnd: 2*this.sideMargin(),
    onChange: (instance) => {
      this.syncVisibleMedia(instance.getVirtualItems());
    }
  }));

  private endReachedSubject = new Subject<void>();
  endReached = output<void>();
  private readonly COOLDOWN_TIME = 500;
  private triggerCooldown() {
    this.endReachedSubject.next();
  }

  private syncVisibleMedia(virtualItems: VirtualItem[]) {
    const visibleIds = virtualItems.map(vItem => this.getMediaLayout(vItem.index).id);

    if (virtualItems.length === 0) return;
    const lastItemIndex = virtualItems[virtualItems.length - 1].index;
    if (lastItemIndex >= this.mediaLayoutData().length - 1) {
      this.triggerCooldown();
    }

    const missingIds = visibleIds.filter(id => {
      return this.entityService.getMedia(id) === null;
    });

    if (missingIds.length > 0) {
      this.scrollSubject.next(missingIds);
    }
  }

  isAtEnd = computed(() => {
    const offset = this.virtualizer.scrollOffset()!;
    const total = this.virtualizer.getTotalSize();
    const viewportWidth = this.scrollElement?.nativeElement?.clientWidth || 0;

    return offset + viewportWidth >= total - 5;
  });

  scroll(direction: 'left' | 'right') {
    const container = this.scrollElement.nativeElement;
    const scrollAmount = container.clientWidth * 0.8;
    const currentScroll = container.scrollLeft;
    
    const targetOffset = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount;
  
    this.virtualizer.scrollToOffset(targetOffset, { behavior: 'smooth' });
  }

  constructor() {
    this.endReachedSubject.pipe(
      delay(this.COOLDOWN_TIME),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.endReached.emit();
    });

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

    const cssSideMargin = style.getPropertyValue('--side-margin').trim();
    if (cssSideMargin) {
      this.sideMargin.set(parseInt(cssSideMargin, 10));
    }
  }
}
