import { Component, computed, ElementRef, HostListener, input, output, signal, ViewChild } from '@angular/core';

import { NumericRangeDirective } from "@app/directive/numeric-range.directive";

@Component({
  selector: 'app-score-display-percent',
  standalone: true,
  imports: [NumericRangeDirective],
  templateUrl: './score-display-percent.component.html',
  styleUrl: './score-display-percent.component.scss'
})
export class ScoreDisplayPercentComponent {
  score = input.required<number | undefined>();
  scoreChange = output<number | undefined>();

  @ViewChild('scoreText') scoreText!: ElementRef;

  /* circle style */

  radius = 20;
  circumference = 2 * Math.PI * this.radius;
  strokeDashoffset = computed(() => {
    const val = this.score() ?? 0;
    return this.circumference - (val / 100) * this.circumference;
  });
  scoreColor = computed(() => {
    const score = this.score();
    if (!score) return 'var(--color-dark-soft)';

    // 0% -> 0 (red)
    // 100% -> 110 (green)
    const hue = (score / 100) * 110;

    // Hue, Saturation, Lightness
    return `hsl(${hue}, 75%, 45%)`;
  });

  /* slide params */

  private clickTimer: any;
  private isClick = false;
  private clickThresholdMs = 200;
  public isDragging = false;
  private startX = 0;
  private startY = 0;
  private startScore = 0;
  private sensitivity = 2;

  /* functions */

  onFocus(event: FocusEvent) {
    const el = event.target as HTMLElement;
    if (el.innerText === '_') {
      el.innerText = '';
    }
    el.focus();
  }

  onBlur(event: FocusEvent) {
    const el = event.target as HTMLElement;
    const val = el.innerText.replace(/\D/g, '');

    if (val.trim().length === 0) {
      this.scoreChange.emit(undefined);
      el.innerText = '_';
    } else {
      const newScore = Math.min(100, Math.max(0, parseInt(val, 10)));
      const isUndefined = newScore === 0;
      this.scoreChange.emit(isUndefined ? undefined : newScore);
      el.innerText = isUndefined ? '_' : newScore.toString();
    }
  }

  onEnter(event: Event) {
    (event.target as HTMLElement).blur();
  }

  onCancel(event: Event) {
    const el = event.target as HTMLElement;
    const score = this.score();
    el.innerText = score ? score.toString() : '_';

    (event.target as HTMLElement).blur();
  }

  onPointerDown(event: PointerEvent) {
    this.isDragging = true;
    this.isClick = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startScore = this.score() ?? 0;

    // capture the pointer for the slide
    (event.target as HTMLElement).setPointerCapture(event.pointerId);

    // timer 
    this.clickTimer = setTimeout(() => {
      this.isClick = false;
    }, this.clickThresholdMs);

    event.preventDefault();
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent) {
    const el = this.scoreText.nativeElement;

    // if there is a big pointer movement -> its a slide
    if (this.isClick) {
      const deltaX = Math.abs(event.clientX - this.startX);
      const deltaY = Math.abs(event.clientY - this.startY);
      if (deltaX > 5 || deltaY > 5) {
        this.isClick = false;
        clearTimeout(this.clickTimer);
      }
    }

    // calculate score from slide
    if (!this.isClick && this.isDragging) {
      const deltaX = event.clientX - this.startX;
      const deltaY = this.startY - event.clientY;
      const delta = deltaX + deltaY;
      const change = Math.round(delta / this.sensitivity);
      const newScore = Math.min(100, Math.max(0, this.startScore + change));
      const isUndefined = newScore === 0;

      if (newScore !== this.score()) {
        this.scoreChange.emit(isUndefined ? undefined : newScore);
        el.innerText = isUndefined ? '_' : newScore.toString();
      }
    }
  }

  @HostListener('window:pointerup', ['$event'])
  onPointerUp(event: PointerEvent) {
    clearTimeout(this.clickTimer);

    // it was a rapid click -> launch edition
    if (this.isClick) {
      this.scoreText.nativeElement.focus();
    }
    
    this.isClick = false;
    this.isDragging = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }
}
