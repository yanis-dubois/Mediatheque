import { Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { CollectionMediaType } from '@app/models/collection.model';
import { MediaType } from '@app/models/media.model';

import { filter, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavService {

  private _context = signal<CollectionMediaType>({ type: 'ALL' });
  readonly context = this._context.asReadonly();

  private _isSearch = signal<boolean>(false);
  readonly isSearch = this._isSearch.asReadonly();

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => {
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) route = route.firstChild;
        return route.paramMap;
      })
    ).subscribe(params => {
      const ctxParam = params.get('context');

      // if we are in SEARCH
      this._isSearch.set(this.router.url === '/search');

      // if a context is specified in the path, update it
      if (ctxParam && ctxParam !== 'ALL') {
        this._context.set({ type: 'SPECIFIC', value: ctxParam as MediaType });
      } 
      // if we are in ALL
      else if (!ctxParam || ctxParam === 'ALL') {
        this._context.set({ type: 'ALL' });
      }
    });
  }

}
