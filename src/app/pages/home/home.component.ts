import { Component, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionComponent } from '@components/collection/collection.component';
import { CollectionDisplayMode } from '@models/collection.model';
import { DropdownComponent } from "@app/components/dropdown/dropdown.component";
import { CollectionActionComponent } from "@app/components/collection-action/collection-action.component";
import { PinService } from '@app/services/pin.service';
import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { NavService } from '@app/services/nav.service';
import { HumanizePipe } from "../../pipe/humanize";
import { MetadataType } from '@app/models/entity.model';
import { MediaType } from '@app/models/media.model';
import { HomeActionComponent } from "@app/components/home-action/home-action.component";

interface MetadataLink {
  label: string;
  type: MetadataType;
  allowedMediaTypes?: MediaType[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionComponent, DropdownComponent, CollectionActionComponent, ActionBarComponent, HumanizePipe, HomeActionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected readonly CollectionDisplayMode = CollectionDisplayMode;
  protected readonly MetadataType = MetadataType;

  context = this.navService.context;
  collectionIds = computed(() => {
    return this.pinService.getPinnedIds(this.context());
  });

  activeMenuId = signal<string | null>(null);
  isMenuOpen = signal<boolean>(true);

  // defines which metadatas are available for which context
  readonly metadataLinks: MetadataLink[] = [
    { label: 'Persons', type: MetadataType.PERSON },
    { label: 'Companies', type: MetadataType.COMPANY },
    { label: 'Saga', type: MetadataType.SAGA },
    { label: 'Genre', type: MetadataType.GENRE },
    { 
      label: 'Game Mechanics', 
      type: MetadataType.GAME_MECHANIC, 
      allowedMediaTypes: [MediaType.VIDEO_GAME, MediaType.TABLETOP_GAME] 
    }
  ];
  visibleLinks = computed(() => {    
    return this.metadataLinks.filter(link => {
      const currentContext = this.context();

      if (currentContext.type === 'ALL' || !link.allowedMediaTypes) return true;

      return link.allowedMediaTypes.includes(currentContext.value as MediaType);
    });
  });

  constructor(
    private navService: NavService,
    private pinService: PinService
  ) {
    effect(() => {
      this.collectionIds();
    });
  }

}
