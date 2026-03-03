import { Component, effect, ElementRef, HostListener, inject, input, signal, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject, switchMap } from 'rxjs';

import { injectVirtualizer, VirtualItem } from '@tanstack/angular-virtual';

import { DropdownComponent } from '@components/dropdown/dropdown.component';
import { CollectionActionComponent } from '@components/collection-action/collection-action.component';
import { CollectionComponent } from "@components/collection/collection.component";

import { Collection, CollectionDisplayMode } from '@models/collection.model';

import { CollectionService } from '@services/collection.service';

@Component({
  selector: 'app-collections-virtualization',
  standalone: true,
  imports: [CommonModule, DropdownComponent, CollectionActionComponent, CollectionComponent],
  templateUrl: './collections-virtualization.component.html',
  styleUrls: ['./collections-virtualization.component.scss']
})
export class CollectionsVirtualizationComponent {
  @ViewChild('scrollElement') scrollElement!: ElementRef<HTMLElement>;

  private scrollSubject = new Subject<string[]>();
  private el = inject(ElementRef);

  protected readonly CollectionDisplayMode = CollectionDisplayMode;

  collectionIds = input.required<string[]>();
  loading = signal(true);
  activeMenuId = signal<string | null>(null);

  containerHeight = signal(228);

  virtualizer = injectVirtualizer(() => ({
    count: this.collectionIds().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement?.nativeElement || null,
    estimateSize: () => {
      return this.containerHeight();
    },
    overscan: 5,
    onChange: (instance) => {
      this.syncVisibleCollection(instance.getVirtualItems());
    }
  }));

  private syncVisibleCollection(virtualItems: VirtualItem[]) {
    const visibleIds = virtualItems.map(vItem => this.collectionIds()[vItem.index]);

    const missingIds = visibleIds.filter(id => {
      return this.collectionService.getCollectionSignal(id)() === null;
    });

    if (missingIds.length > 0) {
      this.scrollSubject.next(missingIds);
    }
  }

  constructor(
    private collectionService: CollectionService
  ) {
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
      debounceTime(50),
      switchMap(async (ids) => {
        // only gets the missing medias
        const missingIds = ids.filter(id => this.collectionService.getCollectionSignal(id)() === null);
        if (missingIds.length === 0) return [];

        try {
          // retrieve data
          return await this.collectionService.getCollectionBatch(missingIds);
        } catch (e) {
          console.error("Batch load failed", e);
          return [];
        }
      })
    ).subscribe((collections: Collection[]) => {
      // fill the cache
      collections.forEach(c => this.collectionService.setCollection(c));
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
      this.containerHeight.set(parseInt(cssWidth, 10) * 1.5 + 56);
    }
  }

}
