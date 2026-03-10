import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";
import { ApiSearchResult } from '@app/models/api.model';

@Component({
  selector: 'app-api-search-row',
  standalone: true,
  imports: [CommonModule, EntityRowLayoutComponent],
  templateUrl: './api-search-row.component.html',
  styleUrls: ['../../../style/entity-row.scss', './api-search-row.component.scss']
})
export class ApiSearchRowComponent {

  entity = input.required<ApiSearchResult>();
  height = input.required<number>();
  width = input.required<number>();

}
