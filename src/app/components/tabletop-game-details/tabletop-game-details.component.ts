import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TabletopGame } from '@models/media-details.model';

@Component({
  selector: 'app-tabletop-game-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabletop-game-details.component.html',
  styleUrl: './tabletop-game-details.component.css'
})
export class TabletopGameDetailsComponent {
  @Input({ required: true }) game!: TabletopGame;
}
