import { BreakpointObserver } from "@angular/cdk/layout";
import { computed, inject, Injectable } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { map } from "rxjs";

export enum ScreenSize {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP',
}

@Injectable({ providedIn: 'root' })
export class ScreenService {

  private breakpointObserver = inject(BreakpointObserver);

  private readonly QUERIES = {
    [ScreenSize.MOBILE]: '(max-width: 599px)',
    [ScreenSize.TABLET]: '(min-width: 600px) and (max-width: 1023px)',
    [ScreenSize.DESKTOP]: '(min-width: 1024px)',
  };

  readonly size = toSignal(
    this.breakpointObserver.observe(Object.values(this.QUERIES)).pipe(
      map(result => {
        if (result.breakpoints[this.QUERIES[ScreenSize.MOBILE]]) return ScreenSize.MOBILE;
        if (result.breakpoints[this.QUERIES[ScreenSize.TABLET]]) return ScreenSize.TABLET;
        return ScreenSize.DESKTOP;
      })
    ),
    { initialValue: ScreenSize.DESKTOP }
  );

  readonly isMobile = computed(() => this.size() === ScreenSize.MOBILE);
  readonly isAtLeastTablet = computed(() => this.size() !== ScreenSize.MOBILE);
}
