import { Component, computed, inject, input, output } from '@angular/core';

import { ScoreDisplayMode } from '@app/models/score.model';
import { SettingsService } from '@app/services/settings.service';
import { ScoreDisplayPercentComponent } from "@components/score-display-percent/score-display-percent.component";
import { ScoreDisplayThreeStepComponent } from "@components/score-display-three-step/score-display-three-step.component";
import { ScoreDisplayFiveStepComponent } from "@components/score-display-five-step/score-display-five-step.component";
import { ScoreDisplayStarsComponent } from "@components/score-display-stars/score-display-stars.component";

@Component({
  selector: 'app-score-display',
  standalone: true,
  imports: [ScoreDisplayPercentComponent, ScoreDisplayThreeStepComponent, ScoreDisplayFiveStepComponent, ScoreDisplayStarsComponent],
  templateUrl: './score-display.component.html',
  styleUrl: './score-display.component.scss'
})
export class ScoreDisplayComponent {
  score = input.required<number | undefined>();
  scoreChange = output<number | undefined>();

  settingsService = inject(SettingsService);
  displayMode = computed(() => this.settingsService.scoreDisplayMode());
  ScoreDisplayModes = ScoreDisplayMode;

}
