import { Component, inject, Renderer2, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { NavigationComponent } from "./components/navigation/navigation.component";
import { slideInAnimation } from './animation/page.animation';
import { NavService } from './services/nav.service';
import { ScreenService } from './services/screen.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationComponent],
  animations: [ slideInAnimation ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  private router = inject(Router);
  private navService = inject(NavService);
  private screenService = inject(ScreenService);
  private renderer = inject(Renderer2);

  constructor() {
    this.detectHoverCapability();
  }

  private detectHoverCapability() {
    // check if app is run on a touchscreen device
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hostClass = isTouch ? 'is-touch' : 'has-hover';
    this.renderer.addClass(document.body, hostClass);
  }

  prepareRoute(outlet: RouterOutlet) {
    if (!this.screenService.isMobile()) return null;
    return `${this.router.url}:${this.navService.direction()}:${this.navService.orientation()}`;
  }

}
