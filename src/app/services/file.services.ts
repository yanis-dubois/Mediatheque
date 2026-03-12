import { Injectable, signal } from '@angular/core';

import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';

export enum FolderType {
  Poster,
  Backdrop
}

@Injectable({ providedIn: 'root' })
export class FileService {

  public postersDirectory = signal<string | null>(null);
  public backdropDirectory = signal<string | null>(null);

  constructor() {
    this.initDirectory();
  }

  public async initDirectory() {
    try {
      const appDataDirPath = await appDataDir();
      this.postersDirectory.set(
        await join(appDataDirPath, `posters`)
      );
      this.backdropDirectory.set(
        await join(appDataDirPath, `backdrops`)
      );
    } catch (e) {
      console.error("Error while initializing directory", e);
    }
  }

  getUrlFromPath(folder: FolderType, mediaId: string): string {
    let directory = null;
    switch (folder) {
      case FolderType.Poster: 
        directory = this.postersDirectory();
        break;
      case FolderType.Backdrop: 
        directory = this.backdropDirectory();
        break;
    }

    if (!directory) return '';
    return convertFileSrc(`${directory}/${mediaId}.jpg`);
  }

}
