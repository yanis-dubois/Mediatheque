import { Component, computed, ContentChild, effect, ElementRef, HostListener, inject, input, output, signal, TemplateRef, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, delay, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  private entityService = inject(EntityService);

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  minColumnWidth = signal(150);
  containerWidth = signal(0);
  navHeight = signal<number>(50);

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
    overscan: 5,
    paddingEnd: this.navHeight(),
    onChange: (instance) => {
      this.syncVisibleMedia(instance.getVirtualItems());
    }
  }));

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

  private endReachedSubject = new Subject<void>();

  constructor() {
    this.endReachedSubject.pipe(
      delay(this.COOLDOWN_TIME),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.endReached.emit();
    });

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
      this.minColumnWidth.set(parseInt(cssWidth, 10));
    }

    const width = this.scrollElement.nativeElement.clientWidth;
    if (width > 0) {
      this.containerWidth.set(width);
    }

    const cssNavHeight = style.getPropertyValue('--nav-height').trim();
    if (cssNavHeight) {
      this.navHeight.set(parseInt(cssNavHeight, 10));
    }
  }
}
