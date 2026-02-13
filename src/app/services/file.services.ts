import { Injectable, signal } from '@angular/core';

import { convertFileSrc } from '@tauri-apps/api/core';
import { appDataDir, join } from '@tauri-apps/api/path';

@Injectable({ providedIn: 'root' })
export class FileService {

  public postersDirectory = signal<string | null>(null);

  constructor() {
    this.initPostersDirectory();
  }

  public async initPostersDirectory() {
    try {
      const appDataDirPath = await appDataDir();
      const path = await join(appDataDirPath, `posters`);
      this.postersDirectory.set(path);
    } catch (err) {
      console.error("Unable to find /posters folder", err);
    }
  }

  getPosterUrl(mediaId: string): string {
    const postersDirectory = this.postersDirectory();

    if (!postersDirectory) return '';
    return convertFileSrc(`${postersDirectory}/${mediaId}.jpg`);
  }

}
