import { Injectable, signal } from '@angular/core';

import { appDataDir } from '@tauri-apps/api/path';

@Injectable({ providedIn: 'root' })
export class FileService {

  private _appDataPath = signal<string | null>(null);
  readonly appDataPath = this._appDataPath.asReadonly();

  constructor() {
    this.initDirectory();
  }

  public async initDirectory() {
    try {
      this._appDataPath.set(
        await appDataDir()
      );
    } catch (e) {
      console.error("Error while initializing directory", e);
    }
  }

}
