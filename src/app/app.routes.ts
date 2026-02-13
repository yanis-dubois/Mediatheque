import { Routes } from "@angular/router";

import { HomeComponent } from '@pages/home/home.component';
import { CollectionsPageComponent } from '@pages/collections-page/collections-page.component'
import { CollectionPageComponent } from '@pages/collection-page/collection-page.component'
import { MediaPageComponent } from '@pages/media-page/media-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'collections',
    component: CollectionsPageComponent
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
