import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { MediaType } from '@models/media.model';
import { EmojizePipe } from "../../pipe/emojize";
import { NavService, PageType } from '@app/services/nav.service';
import { CollectionMediaType, compareCollectionMediaType } from '@app/models/collection.model';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [RouterModule, EmojizePipe],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss'
})
export class NavigationComponent {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private navService = inject(NavService);
  currentContext = this.navService.context;
  currentPage = this.navService.page;

  PageType = PageType;
  mediaType = Object.values(MediaType);

  onContextChange(targetType?: MediaType) {
    const currentContext = this.currentContext();
    const newContext: CollectionMediaType = targetType 
      ? { type: 'SPECIFIC', value: targetType } 
      : { type: 'ALL' };

    const isSameContext = compareCollectionMediaType(newContext, currentContext);
    const currentPage = this.currentPage();
    const target = currentPage === PageType.SEARCH ? ['/search'] : ['/home'];

    if (isSameContext) {
      this.navService.isBackward.set(true);
      this.router.navigate(target, { replaceUrl: true });
    } 
    else {
      this.navService.switchContext(newContext);

      if (!this.navService.canSwitchContext()) {
        this.router.navigate(target, { replaceUrl: true });
      }
    }
  }

  onPageChange(page: 'home' | 'search') {
    const currentPage = this.currentPage();
    this.navService.isBackward.set(true);

    if (page === 'home') {
      if (currentPage === PageType.HOME) {
        this.navService.switchContext({type: 'ALL'});
      }
      this.router.navigate(['/home'], { replaceUrl: true });
    } else {
      if (currentPage === PageType.SEARCH) {
        this.navService.switchContext({type: 'ALL'});
      }
      this.router.navigate(['/search'], { replaceUrl: true });
    }
  }

  isTypeActive(type?: string): boolean {
    const ctx = this.currentContext();
    const page = this.currentPage();

    // search button
    if (type === PageType.SEARCH)
      return page === PageType.SEARCH;

    // home button
    if (type === PageType.HOME) {
      return page === PageType.HOME;
    }

    // context buttons
    if (!type) {
      return ctx.type === 'ALL'
    }
    return ctx.type === 'SPECIFIC' && ctx.value === type;
  }

}
