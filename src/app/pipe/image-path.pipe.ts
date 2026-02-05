import { Pipe, PipeTransform } from '@angular/core';

import { FileService } from '@app/services/file.services';

@Pipe({
  name: 'posterPath',
  standalone: true
})
export class PosterPathPipe implements PipeTransform {

  constructor(private fileService: FileService ) {}

  // uuid -> /path/to/posters/uuid.jpg
  transform(mediaId: string): string {
    if (!this.fileService.postersDirectory()) {
      return ''; 
    }

    return this.fileService.getPosterUrl(mediaId);
  }

}
