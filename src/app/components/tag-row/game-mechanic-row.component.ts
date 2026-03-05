import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EntityType, Tag } from '@app/models/entity.model';
import { EntityRow } from '@app/directive/entity-row.component';
import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";
import { HumanizePipe } from "../../pipe/humanize";

@Component({
  selector: 'app-game-mechanic-row',
  standalone: true,
  imports: [CommonModule, EntityRowLayoutComponent, HumanizePipe],
  templateUrl: './tag-row.component.html',
  styleUrls: ['../../../style/entity-row.scss']
})
export class GameMechanicRowComponent extends EntityRow<Tag & {type: EntityType.GAME_MECHANIC}> {
  override entityId = input.required<string>({ alias: 'id' });
  type = EntityType.GAME_MECHANIC;
}
