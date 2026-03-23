import { APP_INITIALIZER, ApplicationConfig } from "@angular/core";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from "@app/app.routes";

import { FileService } from "@services/file.services";
import { SettingsService } from "@services/settings.service";
import { PinService } from "@services/pin.service";
import { ImageService } from "./services/image.service";

function initializeApp(fileService: FileService, settingsService: SettingsService, pinService: PinService, imageService: ImageService) {
  return () => {
    fileService.initDirectory();
    settingsService.loadSettings();
    pinService.refresh();
    imageService.loadConfigs();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes, 
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      })
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [FileService, SettingsService, PinService, ImageService],
      multi: true
    },
    provideAnimations(),
  ],
};
