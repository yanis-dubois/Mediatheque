import { computed, Injectable, signal } from '@angular/core';
import { ScoreDisplayMode } from '@app/models/score.model';
import { Theme } from '@app/models/settings.model';
import { invoke } from '@tauri-apps/api/core';

export const SettingsKeys = {
  SCORE_DISPLAY_MODE: 'SCORE_DISPLAY_MODE',
  THEME: 'THEME',
} as const;

export interface AppSettings {
  [SettingsKeys.SCORE_DISPLAY_MODE]: ScoreDisplayMode;
  [SettingsKeys.THEME]: Theme;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {

  private state = signal<AppSettings>({
    [SettingsKeys.SCORE_DISPLAY_MODE]: ScoreDisplayMode.PERCENT,
    [SettingsKeys.THEME]: Theme.SYSTEM,
  });

  readonly scoreDisplayMode = computed(() => this.state().SCORE_DISPLAY_MODE);
  readonly theme = computed(() => this.state().THEME);

  private mapSettings(raw: Record<string, string>): Partial<AppSettings> {
    const mapped: Partial<AppSettings> = {};

    if (raw['SCORE_DISPLAY_MODE']) {
      mapped.SCORE_DISPLAY_MODE = raw['SCORE_DISPLAY_MODE'] as ScoreDisplayMode;
    }
    if (raw['THEME']) {
      mapped.THEME= raw['THEME'] as any;
    }

    return mapped;
  }

  async loadSettings() {
    try {
      const allSettings = await invoke<Record<string, string>>('get_all_settings');

      this.state.update(current => ({
        ...current,
        ...this.mapSettings(allSettings)
      }));

      console.log("Settings loaded:", this.state());
    } catch (e) {
      console.error("Failed to load settings from DB, using defaults.", e);
    }
  }

  async updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    this.state.update(s => ({ ...s, [key]: value }));

    try {
      await invoke('save_setting', { key, value });
    } catch (e) {
      console.error(`Failed to save ${key}`, e);
    }
  }
}
