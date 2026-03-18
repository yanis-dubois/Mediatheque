import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { SettingsKeys, SettingsService } from '@app/services/settings.service';
import { ScoreDisplayMode } from '@app/models/score.model';
import { ActionBarComponent } from "@app/components/action-bar/action-bar.component";
import { HumanizePipe } from "@pipe/humanize";
import { Language, Theme } from '@app/models/settings.model';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionBarComponent, HumanizePipe],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css'
})
export class SettingsPageComponent { 

  settings = inject(SettingsService);
  protected readonly SettingsKeys = SettingsKeys;
  scoreDisplayModes = Object.values(ScoreDisplayMode);
  themes = Object.values(Theme);
  languages = Object.values(Language);

  onModeChange(key: keyof typeof SettingsKeys, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.settings.updateSetting(SettingsKeys[key], select.value as any);
  }

}
