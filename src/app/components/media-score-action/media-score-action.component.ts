import { Component, computed, effect, inject, input, signal } from '@angular/core';

import { MediaService } from '@app/services/media.service';
import { EntityService } from '@app/services/entity.service';
import { ScoreDisplayComponent } from "../score-display/score-display.component";
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-media-score-action',
  standalone: true,
  imports: [ScoreDisplayComponent],
  templateUrl: './media-score-action.component.html',
})
export class MediaScoreActionComponent {

  mediaId = input.required<string>();

  private entityService = inject(EntityService);
  private mediaService = inject(MediaService);

  media = computed(() => {
    return this.entityService.getMedia(this.mediaId());
  });

  protected localScore = signal<number | undefined>(undefined);
  private scoreUpdate$ = new Subject<{id: string, score: number | undefined}>();

  constructor() {
    effect(() => {
      this.localScore.set(this.media()?.score);
    }, { allowSignalWrites: true });

    this.scoreUpdate$.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) => prev.score === curr.score),
      takeUntilDestroyed()
    ).subscribe(async ({ id, score }) => {
      try {
        await this.mediaService.updateScore(id, score);
      } catch (e) {
        console.error("Error while updating score :", e);
        this.localScore.set(this.media()?.score);
      }
    });
  }

  async updateScore(newScore: number | undefined) {
    const media = this.media();
    if (!media) return;

    // update UI
    this.localScore.set(newScore);

    // send update request
    this.scoreUpdate$.next({ id: media.id, score: newScore });
  }

}
