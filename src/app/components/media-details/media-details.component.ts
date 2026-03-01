import { Component, computed, ElementRef, input, Input, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MovieDetailsComponent } from "@components/movie-details/movie-details.component";
import { SerieDetailsComponent } from "@components/serie-details/serie-details.component";
import { TabletopGameDetailsComponent } from "@components/tabletop-game-details/tabletop-game-details.component";

import { Media, MediaStatus, MediaType } from '@models/media.model'
import { Movie, Series, TabletopGame } from '@models/media-details.model';

import { MediaService } from '@services/media.service'
import { PosterPathPipe } from "@pipe/image-path.pipe";
import { NumericRangeDirective } from "@app/directive/numeric-range.directive";

@Component({
  selector: 'app-media-details',
  standalone: true,
  imports: [CommonModule, MovieDetailsComponent, SerieDetailsComponent, TabletopGameDetailsComponent, PosterPathPipe, NumericRangeDirective],
  templateUrl: './media-details.component.html',
  styleUrl: './media-details.component.css'
})
export class MediaDetailsComponent {
  id = input.required<string>();

  protected readonly MediaType = MediaType;
  protected readonly MediaStatus = MediaStatus;
  statusOptions = Object.values(MediaStatus);

  media = signal<Media | undefined>(undefined);

  favorite = signal(false);
  notes = signal('');
  isEditingNotes = signal(false);
  isSavingNotes = signal(false);
  status = signal<MediaStatus>(MediaStatus.TO_DISCOVER);
  score = signal<number | undefined>(undefined);

  constructor(
    private mediaService: MediaService
  ) {}

  async ngOnInit() {
    const media = await this.mediaService.getById(this.id());

    this.media.set(media);
    this.favorite.set(media.favorite);
    this.notes.set(media.notes);
    this.status.set(media.status);
    this.score.set(media.score);
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
      await this.mediaService.toggleFavorite(this.id(), isFavorite);
      this.favorite.set(isFavorite);
    } catch (e) {
      console.error("Error while updating favorite", e);
    }
  }

  async onStatusChange(newStatus: string) {
    if (!this.media) return;
    const statusEnum = newStatus as MediaStatus;

    try {
      await this.mediaService.updateStatus(this.id(), statusEnum);
      this.status.set(statusEnum);
    } catch (e) {
      console.error("Error while updating status", e);
    }
  }

  async onNotesBlur(newNotes: string) {
    if (!this.media) return;
  
    // save only if changed
    if (newNotes !== this.notes()) {
      try {
        await this.mediaService.updateNotes(this.id(), newNotes);
        this.notes.set(newNotes);
      } catch (e) {
        console.error("Error while updating notes :", e);
      }
    }
  }

  ///////////

  validateScore(el: HTMLElement) {
    el.blur();

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  }

  async onScoreBlur(value: string, el: HTMLElement) {
    const val = value.replace(/\D/g, '');
    console.log("val:",val);

    const isEmpty = val.trim().length === 0;
    if (isEmpty) {
      el.innerText = '_';
      if (this.score() !== undefined) {
        await this.mediaService.updateScore(this.id(), undefined);
        this.score.set(undefined);
      }
      return;
    }

    const newScore = Math.min(100, Math.max(0, parseInt(val, 10)));
    if (newScore === this.score()) {
      this.score.set(newScore);
      el.innerText = newScore.toString();
      return;
    }

    try {
      await this.mediaService.updateScore(this.id(), newScore);
      this.score.set(newScore);
      el.innerText = newScore.toString();
    } catch (e) {
      console.error("Error while updating score :", e);
    }
  }
}
