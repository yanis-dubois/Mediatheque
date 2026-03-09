import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MediaType } from '@models/media.model';
import { EmojizePipe } from "../../pipe/emojize";
import { NavService } from '@app/services/nav.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterModule, EmojizePipe],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.css'
})
export class NavigationComponent {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private navService = inject(NavService);
  currentContext = this.navService.context;
  isInSearch = this.navService.isSearch;

  mediaType = Object.values(MediaType);

  handleNavigation(targetType?: MediaType) {
    const ctx = this.currentContext();

    // if click on already selected context -> go to home
    const isAlreadyActive = targetType 
      ? (ctx.type === 'SPECIFIC' && ctx.value === targetType)
      : (ctx.type === 'ALL');
    if (isAlreadyActive) {
      this.router.navigate(targetType ? ['/home', targetType] : ['/home']);
      return;
    }

    // detect :context param
    let activeRoute = this.route;
    while (activeRoute.firstChild) activeRoute = activeRoute.firstChild;
    const hasContextParam = activeRoute.snapshot.paramMap.has('context');
    console.log(activeRoute.snapshot.paramMap);

    if (hasContextParam) {
      this.router.navigate(targetType ? ['../', targetType] : ['../'], { relativeTo: activeRoute });
    } else {
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
