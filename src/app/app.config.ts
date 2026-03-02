import { APP_INITIALIZER, ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "@app/app.routes";

import { FileService } from "@services/file.services";
import { SettingsService } from "@services/settings.service";
import { PinService } from "@services/pin.service";

function initializeApp(fileService: FileService, settingsService: SettingsService, pinService: PinService) {
  return () => {
    fileService.initPostersDirectory();
    settingsService.loadSettings();
    pinService.refresh();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [FileService, SettingsService, PinService],
      multi: true
    }
  ],
};
