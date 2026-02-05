import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { CollectionQuery, CollectionQueryType } from '@models/collection-query.model';
import { MediaStatus, MediaType } from "@models/media.model";

import { CollectionComponent } from '@components/collection/collection.component';

// TMP
import { MediaService } from '@services/media.service'
import { data } from '@app/data'
// TMP

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, CollectionComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  queries: CollectionQuery[] = [
    {type: CollectionQueryType.FAVORITE},
    {type: CollectionQueryType.RECENT},
    {type: CollectionQueryType.STATUS, status: MediaStatus.IN_PROGRESS},
    {type: CollectionQueryType.STATUS, status: MediaStatus.TO_DISCOVER},
    {type: CollectionQueryType.MEDIA_TYPE, mediaType: MediaType.MOVIE},
    {type: CollectionQueryType.MEDIA_TYPE, mediaType: MediaType.SERIES},
    {type: CollectionQueryType.MEDIA_TYPE, mediaType: MediaType.TABLETOP_GAME},
    {type: CollectionQueryType.ALL},
  ]

  constructor(
    private mediaService: MediaService
  ) {}

  async onAddTestMovie() {
    try {
      console.log("🚀 Envoi du film au backend Rust...");
      await this.mediaService.addToLibrary(data);
      alert("Succès ! Le film a été traité par Rust. Vérifie la console de ton terminal.");
    } catch (error) {
      console.error("❌ Erreur lors de l'appel Tauri :", error);
      alert("Erreur : " + error);
    }
  }
}
