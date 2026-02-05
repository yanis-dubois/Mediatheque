import { APP_INITIALIZER, ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "@app/app.routes";
import { FileService } from "@services/file.services";

function initializeApp(fileService: FileService) {
  return () => fileService.initPostersDirectory();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [FileService],
      multi: true
    }
  ],
};
