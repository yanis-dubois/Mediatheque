import { Pipe, PipeTransform, inject } from '@angular/core';
import { ImageSize, ImageType } from '@app/models/image.model';
import { MediaType } from '@app/models/media.model';
import { ImageService } from '@app/services/image.service';

@Pipe({
  name: 'localImagePath',
  standalone: true
})
export class LocalImagePathPipe implements PipeTransform {
  private imageService = inject(ImageService);

  async transform(
    id: string | undefined,
    source: MediaType,
    type: ImageType,
    size: ImageSize
  ): Promise<string | null> {
    if (!id) return '';
    return await this.imageService.resolveLocalUrl(id, source, type, size);
  }
}
