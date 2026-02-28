import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MediaType } from '@models/media.model';
import { EmojizePipe } from "../../pipe/emojize";

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterModule, EmojizePipe],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent {

  mediaType = Object.values(MediaType);

}
