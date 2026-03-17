import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, group, query, animateChild } from '@angular/animations';

@Component({
  selector: 'app-poster-lightbox',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('fadeInOutOpacity', [
      transition(':enter', [
        group([
          style({ opacity: 0 }),
          animate('200ms ease-out', style({ opacity: 1 })),
          query('@fadeInOutScale', [
            animateChild()
          ], { optional: true })
        ])
      ]),
      transition(':leave', [
        group([
          animate('150ms ease-in', style({ opacity: 0 })),
          query('@fadeInOutScale', [
            animateChild()
          ], { optional: true })
        ])
      ])
    ]),
    trigger('fadeInOutScale', [
      transition(':enter', [
        style({ transform: 'scale(0.9)' }),
        animate('200ms ease-out', style({ transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.9)' }))
      ])
    ])
  ],
  templateUrl: './poster-lightbox.component.html',
  styleUrls: ['./poster-lightbox.component.scss']
})
export class PosterLightboxComponent {
  source = input.required<string | null>();
  title = input.required<string>();

  close = output<void>();

  constructor() {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    document.body.style.overflow = 'auto';
  }
}
