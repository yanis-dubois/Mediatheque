import { Routes } from "@angular/router";

import { HomeComponent } from '@pages/home/home.component';
import { CollectionPageComponent } from '@pages/collection-page/collection-page.component'
import { MediaPageComponent } from '@pages/media-page/media-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'collection/:id',
    component: CollectionPageComponent
  },
  {
    path: 'media/:id',
    component: MediaPageComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
