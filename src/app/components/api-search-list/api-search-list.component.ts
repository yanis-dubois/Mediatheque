import { Component, ContentChild, ElementRef, inject, input, output, signal, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { GenericListComponent } from "../generic-list/generic-list.component";
import { ApiSearchResult } from '@app/models/media.model';
import { ApiSearchRowComponent } from "../api-search-row/api-search-row.component";
import { ApiSearchActionComponent } from "../api-search-action/api-search-action.component";

@Component({
  selector: 'app-api-search-list',
  standalone: true,
  imports: [CommonModule, RouterModule, GenericListComponent, ApiSearchRowComponent, ApiSearchActionComponent],
  templateUrl: './api-search-list.component.html'
})
export class ApiSearchListComponent {
  @ContentChild('rowRef') rowTemplate!: TemplateRef<any>;

  layoutData = input.required<ApiSearchResult[]>();

  private el = inject(ElementRef);

  containerHeight = signal(120);
  containerWidth = signal(100);
  gap = signal(8);
  hasBeenAdded = signal<boolean>(false);

  endReached = output<void>();

  protected updateDimensions() {
    const style = getComputedStyle(this.el.nativeElement);
    const cssWidth = style.getPropertyValue('--card-width-list').trim();

    if (cssWidth) {
      const width = parseInt(cssWidth, 10);
      this.containerWidth.set(width);
      this.containerHeight.set(width * 1.5);
    }
  }

}
