import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PosterPathPipe } from '@pipe/image-path.pipe';
import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";
import { EntityType } from '@app/models/entity.model';
import { Media } from '@app/models/media.model';
import { EntityRow } from '@app/directive/entity-row.component';
import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";
import { getStatusColor } from '@app/models/media.model';
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";

@Component({
  selector: 'app-media-row',
  standalone: true,
  imports: [CommonModule, PosterPathPipe, HumanizePipe, EmojizePipe, EntityRowLayoutComponent, MediaStatusActionComponent, MediaFavoriteActionComponent],
  providers: [HumanizePipe],
  templateUrl: './media-row.component.html',
  styleUrls: ['../../../style/entity-row.scss', './media-row.component.scss']
})
export class MediaRowComponent extends EntityRow<Media & {type: EntityType.MEDIA}> {
  override entityId = input.required<string>({ alias: 'mediaId' });
  type = EntityType.MEDIA;
  roles = input<string[]>([]);

  private humanizePipe = inject(HumanizePipe);

  getStatusColor = getStatusColor;

  formattedRoles = computed(() => {
    const rolesList = this.roles();
    if (rolesList.length === 0) return '';
    return rolesList
      .map(role => this.humanizePipe.transform(role))
      .join(', ');
  });
}
