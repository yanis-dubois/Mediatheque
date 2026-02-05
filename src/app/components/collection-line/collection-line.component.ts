import { Component, effect, ElementRef, HostListener, inject, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { injectVirtualizer } from '@tanstack/angular-virtual';

import { CollectionQuery } from '@models/collection-query.model';
import { Collection } from '@models/collection.model';
import { collectionLink } from '@helper/collection-routing'

import { PosterPathPipe } from '@pipe/image-path.pipe'
import { Media } from '@app/models/media.model';

@Component({
  selector: 'app-collection-line',
  standalone: true,
  imports: [CommonModule, RouterModule, PosterPathPipe],
  templateUrl: './collection-line.component.html',
  styleUrl: './collection-line.component.css'
})
export class CollectionLineComponent {
  @Input({ required: true }) collection!: Collection;
  @Input({ required: true }) query!: CollectionQuery;
  @Input({ required: true }) loading!: boolean;

  collectionLink = collectionLink;

  @ViewChild('scrollElement') set scrollEl(content: ElementRef<HTMLElement>) {
    if (content) {
      this.scrollElement = content;
    }
  }
  scrollElement!: ElementRef<HTMLElement>;

  private el = inject(ElementRef);

  mediaList = signal<Media[]>([]); 
  containerHeight = signal(0);

  virtualizer = injectVirtualizer(() => ({
    count: this.mediaList().length,
    scrollElement: undefined, 
    getScrollElement: () => this.scrollElement.nativeElement || null,
    estimateSize: (index: number) => {
      const height = this.mediaList()[index].imageHeight;
      const width = this.mediaList()[index].imageWidth + 4;
      const lineHeight = this.containerHeight();
      const extraSpace = 8; // for padding & other infos if added (title, ...)

      return ((width * lineHeight) / height) + extraSpace;
    },
    horizontal: true,
    overscan: 5,
  }));

  constructor() {
    effect(() => {
      const scrollEl = this.scrollElement?.nativeElement;
      if (this.virtualizer && scrollEl) {
        setTimeout(() => {
          this.virtualizer.measure();
        });
      }
    });
  }

  ngOnInit() {
    this.mediaList.set(this.collection.mediaList);
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

    // get css var(--card-width-grid)
    const style = getComputedStyle(this.el.nativeElement);
    const cssWidth = style.getPropertyValue('--card-width-line').trim();

    if (cssWidth) {
      const height = parseInt(cssWidth, 10) * 1.5;
      this.containerHeight.set(height);
    }
  }
}
