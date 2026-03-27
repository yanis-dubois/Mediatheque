import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { BookExtension, DetailedMedia, isLibraryMedia, MediaStatus, MediaType, MovieExtension, SeriesExtension, sortEntityByOrder, TabletopGameExtension, TagType, VideoGameExtension } from '@models/media.model'

import { MediaService } from '@services/media.service'
import { ScoreDisplayComponent } from "@app/components/score-display/score-display.component";
import { PosterLightboxComponent } from "../poster-lightbox/poster-lightbox.component";
import { MediaStatusActionComponent } from "../media-status-action/media-status-action.component";
import { DurationPipe } from "../../pipe/duration.pipe";
import { MetadataType } from '@app/models/entity.model';
import { MediaImageComponent } from "../media-image/media-image.component";
import { MediaFavoriteActionComponent } from "../media-favorite-action/media-favorite-action.component";
import { SettingsService } from '@app/services/settings.service';
import { ScoreDisplayMode } from '@app/models/score.model';
import { ExternalImagePathPipe } from '@app/pipe/external-image.pipe';
import { LocalImagePathPipe } from '@app/pipe/local-image.pipe';
import { ImageSize, ImageType } from '@app/models/image.model';
import { ImageService } from '@app/services/image.service';
import { FilterTagsPipe } from "../../pipe/filter-tag.pipe";

const MAX_LENGTH_NOTES = 5000;

@Component({
  selector: 'app-media-details',
  standalone: true,
  imports: [CommonModule, RouterModule, ScoreDisplayComponent, PosterLightboxComponent, MediaStatusActionComponent, DurationPipe, MediaImageComponent, MediaFavoriteActionComponent, FilterTagsPipe],
  providers: [ExternalImagePathPipe, LocalImagePathPipe],
  templateUrl: './media-details.component.html',
  styleUrl: './media-details.component.scss'
})
export class MediaDetailsComponent {

  protected readonly maxLengthNotes = MAX_LENGTH_NOTES;
  imageService = inject(ImageService);
  externalImagePath = inject(ExternalImagePathPipe);
  localImagePath = inject(LocalImagePathPipe);
  protected readonly MetadataType = MetadataType;
  protected readonly MediaType = MediaType;
  protected readonly MediaStatus = MediaStatus;
  protected readonly ImageType = ImageType;
  protected readonly ImageSize = ImageSize;
  protected readonly TagType = TagType;
  statusOptions = Object.values(MediaStatus);
  sortEntityByOrder = sortEntityByOrder;

  originalPosterUrl = signal<string | null>(null);
  posterUrl = signal<string | null>(null);
  backdropUrl = signal<string | null>(null);

  settingsService = inject(SettingsService);
  displayMode = computed(() => this.settingsService.scoreDisplayMode());
  ScoreDisplayModes = ScoreDisplayMode;

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

  async getSource(type: ImageType, size: ImageSize): Promise<string | null> {
    const isPoster = type === ImageType.POSTER;
    const media = this.media();

    // local image
    if (isLibraryMedia(media)) {
      return await this.localImagePath.transform(media.id, media.mediaType, media.source, type, size);
    }

    // external image
    return this.externalImagePath.transform(
      isPoster ? media.posterPath : media.backdropPath,
      media.mediaType,
      media.source, 
      type,
      size
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
  ) {
    effect(async () => {
      const media = this.media();
      this.loadData();
      const posterSize = this.imageService.getRecommendedSize('detail');

      if (media) {
        this.originalPosterUrl.set(
          await this.getSource(ImageType.POSTER, ImageSize.ORIGINAL)
        );
        this.posterUrl.set(
          await this.getSource(ImageType.POSTER, posterSize)
        );
        this.backdropUrl.set(
          await this.getSource(ImageType.BACKDROP, posterSize)
        );
      }
    }, { allowSignalWrites: true });
  }

  loadData() {
    const media = this.media();

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
  asVideoGame(m: DetailedMedia): VideoGameExtension {
    return m as VideoGameExtension;
  }
  asTabletopGame(m: DetailedMedia): TabletopGameExtension {
    return m as TabletopGameExtension;
  }
  asBook(m: DetailedMedia): BookExtension {
    return m as BookExtension;
  }
  asTagType(t: any): TagType {
    return t as TagType;
  }

  hasArtist = (media: DetailedMedia): boolean => {
    return Object.values(media.persons).some(person => 
      person.values.includes("ARTIST")
    );
  };

  async onNotesBlur(newNotes: string) {
    const media = this.media();
    if (!media || !isLibraryMedia(media)) return;

    const cleanNotes = newNotes.length > MAX_LENGTH_NOTES 
      ? newNotes.substring(0, MAX_LENGTH_NOTES) 
      : newNotes;

    // save only if changed
    if (cleanNotes !== this.notes()) {
      try {
        await this.mediaService.updateNotes(media.id, cleanNotes);
        this.notes.set(cleanNotes);
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
