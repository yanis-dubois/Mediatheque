import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PosterPathPipe } from '@pipe/image-path.pipe';
import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";
import { EntityType } from '@app/models/entity.model';
import { Media } from '@app/models/media.model';
import { EntityRow } from '@app/directive/entity-row.component';
import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";

@Component({
  selector: 'app-media-row',
  standalone: true,
  imports: [CommonModule, PosterPathPipe, HumanizePipe, EmojizePipe, EntityRowLayoutComponent],
  templateUrl: './media-row.component.html',
  styleUrls: ['../../../style/entity-row.scss']
})
export class MediaRowComponent extends EntityRow<Media & {type: EntityType.MEDIA}> {
  override entityId = input.required<string>({ alias: 'mediaId' });
  type = EntityType.MEDIA;
}
