import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

// TMP
import { MediaService } from './services/media.service';
import { movieData } from '@app/data'
// TMP

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  // TMP
  constructor(private mediaService: MediaService) {}
  async ngOnInit() {
    console.log("🚀 App initialisée, lancement des tests...");

    try {
      // await this.simulateInitialData(); STOPPED 
      console.log("✅ Données de test insérées.");

      // 3. Optionnel : Rafraîchir ta liste de médias après l'insertion
      // this.mediaService.loadAllMedia(); 
    } catch (err) {
      console.error("❌ Échec du seed :", err);
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
