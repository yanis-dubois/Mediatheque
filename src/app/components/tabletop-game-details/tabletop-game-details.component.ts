import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TabletopGame } from '@models/media-details.model';
import { MetadataType } from '@app/models/entity.model';

@Component({
  selector: 'app-tabletop-game-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tabletop-game-details.component.html',
  styleUrl: './tabletop-game-details.component.css'
})
export class TabletopGameDetailsComponent {
  @Input({ required: true }) game!: TabletopGame;
  protected readonly metadataType = MetadataType;
}
