import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { NavigationComponent } from "./components/navigation/navigation.component";

// TMP
import { MediaService } from './services/media.service';
import { movieData } from '@app/data'
// TMP

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavigationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  // TMP
  constructor(private mediaService: MediaService) {}
  async ngOnInit() {
    try {
      // await this.simulateInitialData();
    } catch (e) {
      console.error("Error while seeding external data :", e);
    }
  }
  async simulateInitialData() {
    for (const movie of movieData) {
      await this.mediaService.addToLibrary(movie);
      break; // only load 1
    }
  }
  // TMP

}
