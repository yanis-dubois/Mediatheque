import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-score-display-stars',
  standalone: true,
  imports: [],
  templateUrl: './score-display-stars.component.html',
  styleUrl: './score-display-stars.component.scss'
})
export class ScoreDisplayStarsComponent {
  score = input.required<number | undefined>();
  scoreChange = output<number | undefined>();

  // [0-100] -> [0-10]
  starCount = computed(() => {
    const s = this.score();
    if (s === undefined || s === null) return 0;
    return Math.ceil(s / 10);
  });

  onChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    const newScore = value === 0 ? undefined : value*10;
    this.scoreChange.emit(newScore);
  }

  onClick(event: MouseEvent) {
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();

    // click position in [0-1]
    const clickPosition = (event.clientX - rect.left) / rect.width;

    let rawScore = clickPosition * 100 + 5;
    if (rawScore <= 10) rawScore = 0;
    rawScore = Math.round(rawScore / 10) * 10;
    rawScore = Math.min(100, Math.max(0, rawScore));

    const newScore = rawScore === 0 ? undefined : rawScore;
    this.scoreChange.emit(newScore);
  }
}
