import { Routes } from "@angular/router";

import { HomeComponent } from '@pages/home/home.component';
import { CollectionsPageComponent } from '@pages/collections-page/collections-page.component'
import { CollectionPageComponent } from '@pages/collection-page/collection-page.component'
import { MediaPageComponent } from '@pages/media-page/media-page.component';
import { SettingsPageComponent } from "./pages/settings-page/settings-page.component";
import { SearchPageComponent } from "./pages/search-page/search-page.component";
import { MetadataPageComponent } from "./pages/metadata-page/metadata-page.component";
import { MetadataListPageComponent } from "./pages/metadata-list-page/metadata-list-page.component";

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
    pathMatch: 'full', 
    redirectTo: 'collections/ALL' 
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
    path: 'search/media/:id',
    component: MediaPageComponent
  },
  {
    path: 'search/media/:source/:type/:id/:isInLibrary',
    component: MediaPageComponent
  },
  { 
    path: 'metadata-list/:type', 
    pathMatch: 'full', 
    redirectTo: 'metadata-list/:type/ALL' 
  },
  {
    path: 'metadata-list/:type/:context',
    component: MetadataListPageComponent
  },
  {
    path: 'metadata/:type/:id',
    component: MetadataPageComponent
  },
  {
    path: 'settings',
    component: SettingsPageComponent
  },
  {
    path: 'search',
    component: SearchPageComponent
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
