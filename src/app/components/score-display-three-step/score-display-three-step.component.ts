import { Component, input, output } from '@angular/core';

import { ThreeStep, threeStepFromPercent, threeStepToPercent } from '@app/models/score.model';
import { HumanizePipe } from "@pipe/humanize";
import { EmojizePipe } from "@pipe/emojize";

@Component({
  selector: 'app-score-display-three-step',
  standalone: true,
  imports: [HumanizePipe, EmojizePipe],
  templateUrl: './score-display-three-step.component.html',
  styleUrl: './score-display-three-step.component.scss'
})
export class ScoreDisplayThreeStepComponent {
  score = input.required<number | undefined>();
  scoreChange = output<number | undefined>();

  options = Object.values(ThreeStep);
  threeStepFromPercent = threeStepFromPercent;

  onChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value as ThreeStep;
    
    const newScore = threeStepToPercent(value);
    
    this.scoreChange.emit(newScore);
  }

}
