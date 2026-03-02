import { Component, input, output } from '@angular/core';

import { FiveStep, fiveStepFromPercent, fiveStepToPercent } from '@app/models/score.model';
import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";

@Component({
  selector: 'app-score-display-five-step',
  standalone: true,
  imports: [HumanizePipe, EmojizePipe],
  templateUrl: './score-display-five-step.component.html',
  styleUrl: './score-display-five-step.component.scss'
})
export class ScoreDisplayFiveStepComponent {
  score = input.required<number | undefined>();
  scoreChange = output<number | undefined>();

  options = Object.values(FiveStep);
  fiveStepFromPercent = fiveStepFromPercent;

  onChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value as FiveStep;
    
    const newScore = fiveStepToPercent(value);
    
    this.scoreChange.emit(newScore);
  }

}
