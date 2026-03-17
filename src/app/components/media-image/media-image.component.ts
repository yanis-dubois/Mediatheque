import { Component, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefaultImageComponent } from "@components/default-image/default-image.component";

@Component({
  selector: 'app-media-image',
  standalone: true,
  imports: [CommonModule, DefaultImageComponent],
  templateUrl: './media-image.component.html'
})
export class MediaImageComponent {
  source = input.required<string | null>();
  title = input.required<string>();
  type = input.required<'poster' | 'backdrop' | 'background'>();
  hasImage = input.required<boolean>();
  customStyle = input<string>('width: 100%; height: 100%; object-fit: contain;');
}
