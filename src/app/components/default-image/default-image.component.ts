import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-default-image',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './default-image.component.html',
  styleUrl: './default-image.component.scss'
})
export class DefaultImageComponent {
  title = input.required<string>();
  type = input.required<'poster' | 'backdrop'>();

  get ratioClass() { return `ratio-${this.type()}`; }
  imageGradient: string = '';

  ngOnChanges(): void {
    this.generateGradient();
  }

  private generateGradient(): void {
    const title = this.title();
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);

    this.imageGradient = `radial-gradient(
      circle at 0% 100%,
      oklch(70% 0.15 ${hue}) 0%,
      oklch(25% 0.1 ${hue + 20}) 70%,
      oklch(15% 0.05 ${hue + 40}) 100%
    )`;
  }
}
