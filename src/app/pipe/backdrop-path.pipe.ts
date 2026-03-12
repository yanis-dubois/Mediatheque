import { Pipe, PipeTransform } from '@angular/core';

import { FileService, FolderType } from '@app/services/file.services';

@Pipe({
  name: 'backdropPath',
  standalone: true
})
export class BackdropPathPipe implements PipeTransform {

  constructor(private fileService: FileService ) {}

  // uuid -> /path/to/backdrop/uuid.jpg
  transform(mediaId: string): string {
    return this.fileService.getUrlFromPath(FolderType.Backdrop, mediaId);
  }

}
