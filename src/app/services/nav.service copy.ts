import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { CollectionMediaType } from '@app/models/collection.model';
import { MediaType } from '@app/models/media.model';

import { filter, map, startWith } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavService {

  private router = inject(Router);

  // get the context from routes after any navigation
  private activeRouteParams = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => {
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route.paramMap;
      }),
      // initial value
      startWith(this.router.routerState.snapshot.root.paramMap)
    )
  );

  readonly context = computed<CollectionMediaType>(() => {
    const params = this.activeRouteParams();
    const ctx = params?.get('context');

    return ctx 
      ? { type: 'SPECIFIC', value: ctx as MediaType } 
      : { type: 'ALL' };
  });

}
