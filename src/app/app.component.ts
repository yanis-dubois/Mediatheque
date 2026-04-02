import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { NavigationComponent } from "./components/navigation/navigation.component";
import { slideInAnimation } from './animation/page.animation';
import { NavService } from './services/nav.service';
import { AnimationService } from './services/animation.service';

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
  private animationService = inject(AnimationService);
  isMobile = this.animationService.isMobile;

  prepareRoute(outlet: RouterOutlet) {
    if (!this.isMobile()) return null;
    return `${this.router.url}:${this.navService.direction()}:${this.navService.orientation()}`;
  }

}
