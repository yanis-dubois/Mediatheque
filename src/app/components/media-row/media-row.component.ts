import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";
import { EntityType } from '@app/models/entity.model';
import { LibraryMedia } from '@app/models/media.model';
import { EntityRow } from '@app/directive/entity-row.directive';
import { EntityRowLayoutComponent } from "../entity-row-layout/entity-row-layout.component";
import { getStatusColor } from '@app/models/media.model';
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";
import { MediaImageComponent } from "../media-image/media-image.component";
import { PosterPathPipe } from "../../pipe/poster-path.pipe";

@Component({
  selector: 'app-media-row',
  standalone: true,
  imports: [CommonModule, HumanizePipe, EmojizePipe, EntityRowLayoutComponent, MediaStatusActionComponent, MediaFavoriteActionComponent, MediaImageComponent, PosterPathPipe],
  providers: [HumanizePipe],
  templateUrl: './media-row.component.html',
  styleUrls: ['../../../style/entity-row.scss']
})
export class MediaRowComponent extends EntityRow<LibraryMedia & {type: EntityType.MEDIA}> {
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
