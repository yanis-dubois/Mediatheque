import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

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

  private router = inject(Router);
  private navService = inject(NavService);
  currentContext = this.navService.context;
  isInSearch = this.navService.isSearch;

  mediaType = Object.values(MediaType);

  handleNavigation(targetType?: MediaType) {
    const currentUrl = this.router.url;
    const ctx = this.currentContext();

    // if click on already selected context -> go to home
    const isAlreadyActive = targetType 
      ? (ctx.type === 'SPECIFIC' && ctx.value === targetType)
      : (ctx.type === 'ALL');
    if (isAlreadyActive) {
      this.router.navigate(targetType ? ['/home', targetType] : ['/home']);
      return;
    }

    // change context -> verify if we can switch context on this page
    if (currentUrl.includes('/collections')) {
      this.router.navigate(targetType ? ['/collections', targetType] : ['/collections']);
    } 
    // else -> go to home
    else {
      this.router.navigate(targetType ? ['/home', targetType] : ['/home']);
    }
  }

  isTypeActive(type?: string): boolean {
    const ctx = this.currentContext();

    // search button
    if (this.isInSearch())
      return type === 'SEARCH';

    // others
    if (!type) {
      return ctx.type === 'ALL';
    }
    return ctx.type === 'SPECIFIC' && ctx.value === type;
  }

}
