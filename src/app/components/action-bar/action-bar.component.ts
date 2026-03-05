import { Component, computed, input } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [],
  templateUrl: './action-bar.component.html',
  styleUrl: './action-bar.component.css'
})
export class ActionBarComponent {
  leftButtonType = input<string>('back');

  constructor(
    private location: Location,
    private router: Router
  ) {}

  goToSettings() {
    this.router.navigateByUrl('/settings');
  }

  goToHome() {
    this.router.navigateByUrl('/home');
  }

  goToPreviousPage() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }

}
