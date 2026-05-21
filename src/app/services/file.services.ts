import { Injectable, signal } from '@angular/core';

import { invoke } from "@tauri-apps/api/core";

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
        await invoke<string>('get_custom_app_data_dir')
      );
    } catch (e) {
      console.error("Error while initializing directory", e);
    }
  }

}
