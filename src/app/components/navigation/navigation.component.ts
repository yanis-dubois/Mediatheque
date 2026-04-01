import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

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

    if (isSameContext) {
      const currentPage = this.currentPage();
      this.navService.isBackward.set(true);

      if (currentPage === PageType.SEARCH) {
        this.router.navigate(['/search'], { replaceUrl: true });
      } else {
        this.router.navigate(['/home'], { replaceUrl: true });
      }
    } else {
      this.navService.switchContext(newContext);
    }
  }

  onPageChange(page: 'home' | 'search') {
    this.navService.isBackward.set(true);

    if (page === 'home') {
      this.router.navigate(['/home'], { replaceUrl: true });
    } else {
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
