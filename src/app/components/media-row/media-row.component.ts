import { Component, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Media } from '@models/media.model';

import { PosterPathPipe } from '@pipe/image-path.pipe';
import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";

@Component({
  selector: 'app-media-row',
  standalone: true,
  imports: [CommonModule, PosterPathPipe, HumanizePipe, EmojizePipe],
  templateUrl: './media-row.component.html',
  styleUrls: ['./media-row.component.css']
})
export class MediaRowComponent {
  @Input({ required: true }) media!: Media;
  @Input({ required: true }) width! : number;
  @Input({ required: true }) height! : number;
}
