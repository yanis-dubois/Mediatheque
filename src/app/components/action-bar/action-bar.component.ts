import { Component, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { NavService } from '@app/services/nav.service';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [],
  templateUrl: './action-bar.component.html',
  styleUrl: './action-bar.component.scss'
})
export class ActionBarComponent {
  leftButtonType = input<string>('back');

  constructor(
    private location: Location,
    private router: Router,
    private navService: NavService
  ) {}

  goToSettings() {
    this.router.navigateByUrl('/settings');
    this.navService.isLeft.set(true);
  }

  goToHome() {
    this.router.navigateByUrl('/home');
    this.navService.isBackward.set(true);
  }

  goToPreviousPage() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
    this.navService.isBackward.set(true);
  }

}
