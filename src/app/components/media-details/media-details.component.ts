import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MovieDetailsComponent } from "@components/movie-details/movie-details.component";
import { SerieDetailsComponent } from "@components/serie-details/serie-details.component";
import { TabletopGameDetailsComponent } from "@components/tabletop-game-details/tabletop-game-details.component";

import { Media, MediaStatus, MediaType } from '@models/media.model'
import { Movie, Series, TabletopGame } from '@models/media-details.model';

import { MediaService } from '@services/media.service'
import { PosterPathPipe } from "@pipe/image-path.pipe";

@Component({
  selector: 'app-media-details',
  standalone: true,
  imports: [CommonModule, MovieDetailsComponent, SerieDetailsComponent, TabletopGameDetailsComponent, PosterPathPipe],
  templateUrl: './media-details.component.html',
  styleUrl: './media-details.component.css'
})
export class MediaDetailsComponent {
  @Input({ required: true }) id!: string;

  protected readonly MediaType = MediaType;
  protected readonly MediaStatus = MediaStatus;
  statusOptions = Object.values(MediaStatus);

  media?: Media;
  loading = true;
  error?: string;

  favorite = signal(false);
  notes = signal('');
  isEditingNotes = signal(false);
  isSavingNotes = signal(false);
  status = signal<MediaStatus>(MediaStatus.TO_DISCOVER);

  constructor(
    private mediaService: MediaService
  ) {}

  async ngOnInit() {
    try {
      this.media = await this.mediaService.getById(this.id);
      this.favorite.set(this.media.favorite);
      this.notes.set(this.media.notes);
      this.status.set(this.media.status);
    } catch (e) {
      console.error(e);
      this.error = 'Media not found 😢';
    } finally {
      this.loading = false;
    }
  }

  asMovie(m: Media): Movie {
    return m as Movie;
  }
  asSerie(m: Media): Series {
    return m as Series;
  }
  asTabletopGame(m: Media): TabletopGame {
    return m as TabletopGame;
  }

  async onToggleFavorite() {
    if (!this.media) return;
    const isFavorite = !this.favorite();
  
    try {
      await this.mediaService.toggleFavorite(this.media.id, isFavorite);
      this.favorite.set(isFavorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

  async onStatusChange(newStatus: string) {
    if (!this.media) return;
    const statusEnum = newStatus as MediaStatus;

    try {
      await this.mediaService.updateStatus(this.media.id, statusEnum);
      this.status.set(statusEnum);
    } catch (e) {
      console.error("Error while updating status", e);
    }
  }

  async onNotesBlur(newNotes: string) {
    if (!this.media) return;
    this.isEditingNotes.set(false);
  
    // save only if changed
    if (newNotes !== this.notes()) {
      this.isSavingNotes.set(true);
      try {
        await this.mediaService.updateNotes(this.media.id, newNotes);
        this.notes.set(newNotes);
      } catch (e) {
        console.error("Failed to save notes :", e);
      } finally {
        // "saving" feedback for 500ms
        setTimeout(() => this.isSavingNotes.set(false), 500);
      }
    }
  }
}
