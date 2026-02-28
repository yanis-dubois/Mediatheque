import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MediaType } from '@models/media.model';
import { EmojizePipe } from "../../pipe/emojize";
import { NavService } from '@app/services/nav.service copy';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterModule, EmojizePipe],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent {

  private navService = inject(NavService);
  currentContext = this.navService.context;

  mediaType = Object.values(MediaType);

  isTypeActive(type?: string): boolean {
    const ctx = this.currentContext();

    if (!type) {
      return ctx.type === 'ALL';
    }

    return ctx.type === 'SPECIFIC' && ctx.value === type;
  }

}
