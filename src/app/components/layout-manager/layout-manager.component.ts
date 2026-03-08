import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CollectionLayout } from '@app/models/collection.model';
import { HumanizePipe } from "../../pipe/humanize";

@Component({
  selector: 'app-layout-manager',
  standalone: true,
  imports: [CommonModule, HumanizePipe],
  templateUrl: './layout-manager.component.html',
})
export class LayoutManagerComponent {

  protected readonly CollectionLayout = CollectionLayout;
  collectionLayoutOption = Object.values(CollectionLayout);

  preferredLayout = input.required<CollectionLayout>();
  preferredLayoutChange = output<CollectionLayout>();

  onLayoutChange(newLayout: CollectionLayout) {
    this.preferredLayoutChange.emit(newLayout);
  }

}
