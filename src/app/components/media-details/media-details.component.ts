import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DetailedMedia, isLibraryMedia, MediaStatus, MediaType, MovieExtension, SeriesExtension, sortEntityByOrder, sortTags, TabletopGameExtension } from '@models/media.model'

import { MediaService } from '@services/media.service'
import { PosterPathPipe } from "@pipe/poster-path.pipe";
import { ScoreDisplayComponent } from "@app/components/score-display/score-display.component";
import { PosterLightboxComponent } from "../poster-lightbox/poster-lightbox.component";
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { DurationPipe } from "../../pipe/duration.pipe";
import { MetadataType } from '@app/models/entity.model';
import { MediaImageComponent } from "../media-image/media-image.component";
import { ImageService, ImageSize, ImageType } from '@app/services/image.service';
import { BackdropPathPipe } from '@app/pipe/backdrop-path.pipe';
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";

@Component({
  selector: 'app-media-details',
  standalone: true,
  imports: [CommonModule, RouterModule, ScoreDisplayComponent, PosterLightboxComponent, MediaStatusActionComponent, DurationPipe, MediaImageComponent, MediaFavoriteActionComponent],
  providers: [PosterPathPipe, BackdropPathPipe],
  templateUrl: './media-details.component.html',
  styleUrl: './media-details.component.scss'
})
export class MediaDetailsComponent {

  posterPath = inject(PosterPathPipe);
  backdropPath = inject(BackdropPathPipe);
  protected readonly MetadataType = MetadataType;
  protected readonly MediaType = MediaType;
  protected readonly MediaStatus = MediaStatus;
  protected readonly ImageType = ImageType;
  statusOptions = Object.values(MediaStatus);
  sortEntityByOrder = sortEntityByOrder;
  sortTags = sortTags;

  media = input.required<DetailedMedia>();

  isLibraryMedia = isLibraryMedia;
  hasPoster = computed(() => {
    const media = this.media();
    if (isLibraryMedia(media)) {
      return media.hasPoster;
    }
    if (media.posterPath) return true;
    return false;
  });
  hasBackdrop = computed(() => {
    const media = this.media();
    if (isLibraryMedia(media)) {
      return media.hasBackdrop;
    }
    if (media.backdropPath) return true;
    return false;
  });

  getSource(type: ImageType, isOriginal: boolean): string {
    const isPoster = type === ImageType.POSTER;
    const media = this.media();
    if (isLibraryMedia(media)) {
      return isPoster 
        ? this.posterPath.transform(media.id) 
        : this.backdropPath.transform(media.id);
    }
    return this.imageService.resolveUrl(
      media.mediaType, 
      type,
      isPoster ? media.posterPath : media.backdropPath, 
      isOriginal ? ImageSize.ORIGINAL : ImageSize.MEDIUM
    );
  }

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
    private mediaService: MediaService,
    private imageService: ImageService
  ) {
    effect(() => {
      this.media();
      this.loadData();
    }, { allowSignalWrites: true });
  }

  loadData() {
    const media = this.media();

    console.log(media);

    if (media && isLibraryMedia(media)) {
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
