import { Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { CollectionMediaType } from '@app/models/collection.model';
import { MediaType } from '@app/models/media.model';

import { filter, map } from 'rxjs';

export enum PageType {
  HOME = "HOME",
  SEARCH = "SEARCH",
}

@Injectable({ providedIn: 'root' })
export class NavService {

  isBackward = signal<boolean>(false);
  direction = signal<'forward' | 'backward'>('forward');
  isLeft = signal<boolean>(false);
  orientation = signal<'right' | 'left'>('right');

  private _context = signal<CollectionMediaType>({ type: 'ALL' });
  readonly context = this._context.asReadonly();

  private _page = signal<PageType>(PageType.HOME);
  readonly page = this._page.asReadonly();

  // for search page 
  searchMode = signal<'library' | 'api'>('api');

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) route = route.firstChild;
        return route.paramMap;
      })
    ).subscribe(params => {
      const url = this.router.url;
      const ctxParam = params.get('context');

      // determine the slide animation
      if (this.isBackward()) {
        this.direction.set("backward");
        this.isBackward.set(false);
      } else {
        this.direction.set("forward");
      }
      if (this.isLeft()) {
        this.orientation.set("left");
        this.isLeft.set(false);
      } else {
        this.orientation.set("right");
      }

      // update page value
      if (url.startsWith('/search')) {
        // transition between HOME to SEARCH if needed
        if (this._page() === PageType.HOME) {
          this.direction.set("forward");
        }

        this._page.set(PageType.SEARCH);
      }
      else if (url === '/' || url.startsWith('/home')) {
        // transition between SEARCH to HOME if needed
        if (this._page() === PageType.SEARCH) {
          this.direction.set("backward");
        }

        this._page.set(PageType.HOME);
      }

      // update context
      // if a context is specified in the path, update it
      if (ctxParam && ctxParam !== 'ALL') {
        this._context.set({ type: 'SPECIFIC', value: ctxParam as MediaType });
      } 
      // if we are in ALL
      else if (ctxParam === 'ALL') {
        this._context.set({ type: 'ALL' });
      }
    });
  }

  switchContext(newContext: CollectionMediaType) {
    this._context.set(newContext);
  }

}
