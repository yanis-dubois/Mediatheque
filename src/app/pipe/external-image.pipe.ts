import { Pipe, PipeTransform, inject } from '@angular/core';
import { ImageSize, ImageType } from '@app/models/image.model';
import { MediaSource, MediaType } from '@app/models/media.model';
import { ImageService } from '@app/services/image.service';

@Pipe({
  name: 'externalImagePath',
  standalone: true
})
export class ExternalImagePathPipe implements PipeTransform {
  private imageService = inject(ImageService);

  transform(
    path: string | undefined,
    mediaType: MediaType,
    source: MediaSource,
    type: ImageType,
    size: ImageSize
  ): string {
    return this.imageService.resolveExternalUrl(path, mediaType, source, type, size);
  }
}
