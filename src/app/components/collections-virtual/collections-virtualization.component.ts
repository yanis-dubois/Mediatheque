import { Component, effect, ElementRef, HostListener, inject, input, output, signal, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, delay, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { DropdownComponent } from '@components/dropdown/dropdown.component';
import { CollectionActionComponent } from '@components/collection-action/collection-action.component';
import { CollectionComponent } from "@components/collection/collection.component";

import { CollectionDisplayMode } from '@models/collection.model';

import { EntityService } from '@app/services/entity.service';
import { EntityType } from '@app/models/entity.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-collections-virtualization',
  standalone: true,
  imports: [CommonModule, DropdownComponent, CollectionActionComponent, CollectionComponent],
  templateUrl: './collections-virtualization.component.html',
  styleUrl: './collections-virtualization.component.scss',
})
export class CollectionsVirtualizationComponent {
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  private entityService = inject(EntityService);

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  protected readonly CollectionDisplayMode = CollectionDisplayMode;

  collectionIds = input.required<string[]>();
  loading = signal(true);
  activeMenuId = signal<string | null>(null);

  containerHeight = signal(202);
  navHeight = signal<number>(50);

  virtualizer = injectVirtualizer(() => ({
    count: this.collectionIds().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: () => {
      return this.containerHeight();
    },
    overscan: 4,
    paddingEnd: this.navHeight(),
    onChange: (instance) => {
      this.syncVisibleCollection(instance.getVirtualItems());
    },
  }));

  private endReachedSubject = new Subject<void>();
  endReached = output<void>();
  private readonly COOLDOWN_TIME = 500;
  private triggerCooldown() {
    this.endReachedSubject.next();
  }

  private syncVisibleCollection(virtualItems: VirtualItem[]) {
    const visibleIds = virtualItems.map(vItem => this.collectionIds()[vItem.index]);

    if (virtualItems.length === 0) return;
    const lastItemIndex = virtualItems[virtualItems.length - 1].index;
    if (lastItemIndex >= this.collectionIds().length - 1) {
      this.triggerCooldown();
    }

    const missingIds = visibleIds.filter(id => {
      return this.entityService.getCollection(id) === null;
    });

    if (missingIds.length > 0) {
      this.scrollSubject.next(missingIds);
    }
  }

  constructor() {
    this.endReachedSubject.pipe(
      delay(this.COOLDOWN_TIME),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.endReached.emit();
    });

    effect(() => {
      const data = this.collectionIds();
      const scrollEl = this.scrollElement?.nativeElement;
      if (data.length > 0 && this.virtualizer && scrollEl) {
        untracked(() => {
          this.virtualizer.measure();
          this.syncVisibleCollection(this.virtualizer.getVirtualItems());
        });
      }
    });

    this.scrollSubject.pipe(
      debounceTime(100),
      switchMap(async (ids) => {
        // only gets the missing medias
        const missingIds = ids.filter(id => !!id && this.entityService.getCollection(id) === null);
        if (missingIds.length === 0) return [];

        try {
          // retrieve data
          return await this.entityService.loadBatch(EntityType.COLLECTION, missingIds);
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
      this.containerHeight.set(parseInt(cssWidth, 10) * 1.5 + 58);
    }

    const cssNavHeight = style.getPropertyValue('--nav-height').trim();
    if (cssNavHeight) {
      this.navHeight.set(parseInt(cssNavHeight, 10));
    }
  }

}
