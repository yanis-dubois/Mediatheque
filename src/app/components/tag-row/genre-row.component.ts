import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EntityType, Tag } from '@app/models/entity.model';
import { EntityRow } from '@app/directive/entity-row.directive';
import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";
import { HumanizePipe } from "../../pipe/humanize";

@Component({
  selector: 'app-genre-row',
  standalone: true,
  imports: [CommonModule, EntityRowLayoutComponent, HumanizePipe],
  templateUrl: './tag-row.component.html',
  styleUrls: ['../../../style/entity-row.scss']
})
export class GenreRowComponent extends EntityRow<Tag & {type: EntityType.GENRE}> {
  override entityId = input.required<string>({ alias: 'id' });
  type = EntityType.GENRE;
}
