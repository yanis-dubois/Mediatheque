import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EmojizePipe } from "@pipe/emojize";
import { EntityType } from '@app/models/entity.model';
import { HumanizePipe } from "../../pipe/humanize";
import { EntityRow } from '@app/directive/entity-row.component';
import { Collection } from '@app/models/collection.model';
import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";

@Component({
  selector: 'app-collection-row-item',
  standalone: true,
  imports: [CommonModule, EmojizePipe, HumanizePipe, EntityRowLayoutComponent],
  templateUrl: './collection-row-item.component.html',
  styleUrls: ['../../../style/entity-row.scss']
})
export class CollectionRowItemComponent extends EntityRow<Collection & {type: EntityType.COLLECTION}> {
  override entityId = input.required<string>({ alias: 'collectionId' });
  type = EntityType.COLLECTION;
}
