import { Component, computed, effect, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DetailedMedia, hasRelations, isLibraryMedia, MediaStatus, MediaType, MovieExtension, SeriesExtension, TabletopGameExtension } from '@models/media.model'

import { MediaService } from '@services/media.service'
import { PosterPathPipe } from "@pipe/poster-path.pipe";
import { ScoreDisplayComponent } from "@app/components/score-display/score-display.component";
import { PosterLightboxComponent } from "../poster-lightbox/poster-lightbox.component";
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { DurationPipe } from "../../pipe/duration.pipe";

@Component({
  selector: 'app-media-details',
  standalone: true,
  imports: [CommonModule, PosterPathPipe, ScoreDisplayComponent, PosterLightboxComponent, MediaStatusActionComponent, DurationPipe],
  templateUrl: './media-details.component.html',
  styleUrl: './media-details.component.css'
})
export class MediaDetailsComponent {

  protected readonly MediaType = MediaType;
  protected readonly MediaStatus = MediaStatus;
  statusOptions = Object.values(MediaStatus);

  media = input.required<DetailedMedia>();

  isLibraryMedia = isLibraryMedia;
  isLibrary = computed(() => isLibraryMedia(this.media()));
  fullDetails = computed(() => hasRelations(this.media()) ? this.media() : null);

  movieExt = computed(() => this.media() as MovieExtension);
  seriesExt = computed(() => this.media() as SeriesExtension);
  gameExt = computed(() => this.media() as MovieExtension);

  favorite = signal(false);
  notes = signal('');
  isEditingNotes = signal(false);
  isSavingNotes = signal(false);
  status = signal<MediaStatus>(MediaStatus.TO_DISCOVER);
  score = signal<number | undefined>(undefined);

  isLightboxOpen = signal(false);

  constructor(
    private mediaService: MediaService
  ) {
    effect(() => {
      this.media();
      this.loadData();
    }, { allowSignalWrites: true });
  }

  async ngAfterInit() {
    this.loadData();
  }

  loadData() {
    const media = this.media();

    if (isLibraryMedia(media)) {
      this.favorite.set(media.favorite);
      this.notes.set(media.notes);
      this.status.set(media.status);
      this.score.set(media.score);
    }
  }

  asMovie(m: DetailedMedia): MovieExtension {
    return m as MovieExtension;
  }
  asSerie(m: DetailedMedia): SeriesExtension {
    return m as SeriesExtension;
  }
  asTabletopGame(m: DetailedMedia): TabletopGameExtension {
    return m as TabletopGameExtension;
  }

  async onToggleFavorite() {
    const media = this.media();
    if (!media || !isLibraryMedia(media)) return;

    const isFavorite = !this.favorite();
  
    try {
      await this.mediaService.toggleFavorite(media.id, isFavorite);
      this.favorite.set(isFavorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

  async onStatusChange(newStatus: string) {
    const media = this.media();
    if (!media || !isLibraryMedia(media)) return;

    const statusEnum = newStatus as MediaStatus;

    try {
      await this.mediaService.updateStatus(media.id, statusEnum);
      this.status.set(statusEnum);
    } catch (e) {
      console.error("Error while updating status", e);
    }
  }

  async onNotesBlur(newNotes: string) {
    const media = this.media();
    if (!media || !isLibraryMedia(media)) return;
  
    // save only if changed
    if (newNotes !== this.notes()) {
      try {
        await this.mediaService.updateNotes(media.id, newNotes);
        this.notes.set(newNotes);
      } catch (e) {
        console.error("Error while updating notes :", e);
      }
    }
  }

  async onScoreChange(newScore: number | undefined) {
    const media = this.media();
    if (!media || !isLibraryMedia(media)) return;

    try {
      await this.mediaService.updateScore(media.id, newScore);
      this.score.set(newScore);
    } catch (e) {
      console.error("Error while updating score :", e);
      this.score.set(this.score());
    }
  }
}
