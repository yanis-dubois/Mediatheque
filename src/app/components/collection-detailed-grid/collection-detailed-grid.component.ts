import { Component, computed, ContentChild, effect, ElementRef, HostListener, inject, input, output, signal, TemplateRef, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { debounceTime, delay, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SettingsService } from '@app/services/settings.service';
import { ScoreDisplayMode } from '@app/models/score.model';
import { MediaOwnership } from '@app/models/settings.model';

@Component({
  selector: 'app-collection-detailed-grid',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './collection-detailed-grid.component.html'
})
export class CollectionDetailedGridComponent {
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;
  @ContentChild('itemRef') itemTemplate!: TemplateRef<any>;

  private entityService = inject(EntityService);

  // all media infos (id, width, height)
  mediaLayoutData = input.required<[string, number, number][]>();

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  private settingsService = inject(SettingsService);
  showScore = this.settingsService.scoreDisplayMode() !== ScoreDisplayMode.HIDDEN;
  showMediaOwnership = this.settingsService.mediaOwnership() !== MediaOwnership.HIDDEN;

  minColumnWidth = signal(0);
  containerWidth = signal(0);
  // cardHeight = signal(198); 
  navHeight = signal<number>(50);
  gap = 12;
  infoHeight = (!this.showScore || !this.showMediaOwnership) 
    ? 72 : 94;

  columns = computed(() => {
    const width = this.containerWidth();
    const minWidth = this.minColumnWidth();
    if (width < 1 || minWidth < 1) return 0;
    return Math.max(1, Math.floor(width / (minWidth + this.gap)));
  });

  columnWidth = computed(() => {
    const totalWidth = this.containerWidth();
    const nbCols = this.columns();
    return (totalWidth - (this.gap * nbCols)) / nbCols;
  });

  // backdrop height (16:9) + infos height (72px)
  cardHeight = computed(() => {
    return this.infoHeight + ((this.columnWidth() * 9) / 16);
  });

  protected getMediaLayout(index: number) {
    const data = this.mediaLayoutData()[index];
    if (!data) return {id: '', width: 0, height: 0};
    return { id: data[0], width: data[1], height: data[2] };
  }

  virtualizer = injectVirtualizer(() => ({
    count: this.mediaLayoutData().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: (index: number) => {
      return this.cardHeight() + this.gap;
    },
    lanes: this.columns(),
    enabled: !!this.scrollElement?.nativeElement && this.columns() > 0,
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
      this.columns();

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
      // this.virtualizer.measure();
    });

    ro.observe(this.scrollElement.nativeElement);

    console.log('grid', this.mediaLayoutData().length, this.minColumnWidth(), this.columnWidth(), this.columns());
  }

  @HostListener('window:resize')
  onResize() {
    this.updateDimensions();
  }

  private updateDimensions() {
    if (!this.scrollElement) return;

    const style = getComputedStyle(this.el.nativeElement);
    const cssWidth = style.getPropertyValue('--card-width-detailed').trim();
    if (cssWidth) {
      this.minColumnWidth.set(parseInt(cssWidth, 10));
    }

    const width = this.scrollElement.nativeElement.clientWidth;
    if (width > 0) {
      this.containerWidth.set(width);
    }

    const cssSideMargin = style.getPropertyValue('--side-margin').trim();
    if (cssSideMargin) {
      this.containerWidth.set(this.containerWidth() - 2 * parseInt(cssSideMargin, 10));
    }

    const cssNavHeight = style.getPropertyValue('--nav-height').trim();
    if (cssNavHeight) {
      this.navHeight.set(parseInt(cssNavHeight, 10));
    }
  }
}
