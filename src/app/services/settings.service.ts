import { computed, Injectable, signal } from '@angular/core';
import { ScoreDisplayMode } from '@app/models/score.model';
import { Language, MediaOwnership, Theme } from '@app/models/settings.model';
import { invoke } from '@tauri-apps/api/core';

export const SettingsKeys = {
  LANGUAGE: "LANGUAGE",
  SCORE_DISPLAY_MODE: 'SCORE_DISPLAY_MODE',
  MEDIA_OWNERSHIP: 'MEDIA_OWNERSHIP',
  THEME: 'THEME',
} as const;

export interface AppSettings {
  [SettingsKeys.LANGUAGE]: Language;
  [SettingsKeys.SCORE_DISPLAY_MODE]: ScoreDisplayMode;
  [SettingsKeys.MEDIA_OWNERSHIP]: MediaOwnership;
  [SettingsKeys.THEME]: Theme;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {

  private state = signal<AppSettings>({
    [SettingsKeys.LANGUAGE]: Language.EN,
    [SettingsKeys.SCORE_DISPLAY_MODE]: ScoreDisplayMode.PERCENT,
    [SettingsKeys.MEDIA_OWNERSHIP]: MediaOwnership.SHOWN,
    [SettingsKeys.THEME]: Theme.SYSTEM,
  });

  readonly language = computed(() => this.state().LANGUAGE);
  readonly scoreDisplayMode = computed(() => this.state().SCORE_DISPLAY_MODE);
  readonly mediaOwnership = computed(() => this.state().MEDIA_OWNERSHIP);
  readonly theme = computed(() => this.state().THEME);

  private mapSettings(raw: Record<string, string>): Partial<AppSettings> {
    const mapped: Partial<AppSettings> = {};

    if (raw['LANGUAGE']) {
      mapped.LANGUAGE= raw['LANGUAGE'] as Language;
    }
    if (raw['SCORE_DISPLAY_MODE']) {
      mapped.SCORE_DISPLAY_MODE = raw['SCORE_DISPLAY_MODE'] as ScoreDisplayMode;
    }
    if (raw['MEDIA_OWNERSHIP']) {
      mapped.MEDIA_OWNERSHIP = raw['MEDIA_OWNERSHIP'] as MediaOwnership;
    }
    if (raw['THEME']) {
      mapped.THEME= raw['THEME'] as Theme;
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
