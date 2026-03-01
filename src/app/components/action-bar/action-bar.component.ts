import { Component, computed } from '@angular/core';
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

  isHomePage = computed(() => {
    const url = this.router.url;
    return url === '/' || url.startsWith('/home');
  });

  constructor(
    private location: Location,
    private router: Router
  ) {}

  goToSettings() {
    this.router.navigateByUrl('/settings');
  }

  goToPreviousPage() {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }

}
