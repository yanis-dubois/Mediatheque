import { Routes } from "@angular/router";

import { HomeComponent } from '@pages/home/home.component';
import { CollectionsPageComponent } from '@pages/collections-page/collections-page.component'
import { CollectionPageComponent } from '@pages/collection-page/collection-page.component'
import { MediaPageComponent } from '@pages/media-page/media-page.component';
import { SettingsPageComponent } from "./pages/settings-page/settings-page.component";

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    component: HomeComponent
  },
  { 
    path: 'home/:context', 
    component: HomeComponent 
  },
  {
    path: 'collections',
    component: CollectionsPageComponent
  },
  {
    path: 'collections/:context',
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
    path: 'settings',
    component: SettingsPageComponent
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
