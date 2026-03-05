import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Company, EntityType } from '@app/models/entity.model';
import { EntityRow } from '@app/directive/entity-row.component';
import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";
import { HumanizePipe } from "../../pipe/humanize";

@Component({
  selector: 'app-company-row',
  standalone: true,
  imports: [CommonModule, EntityRowLayoutComponent, HumanizePipe],
  templateUrl: './company-row.component.html',
  styleUrls: ['../../../style/entity-row.scss']
})
export class CompanyRowComponent extends EntityRow<Company & {type: EntityType.COMPANY}> {
  override entityId = input.required<string>({ alias: 'id' });
  type = EntityType.COMPANY;
}
