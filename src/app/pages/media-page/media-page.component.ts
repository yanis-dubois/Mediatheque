import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@components/action-bar/action-bar.component';
import { MediaDetailsComponent } from '@components/media-details/media-details.component';
import { MediaService } from '@app/services/media.service';
import { ApiMedia, isLibraryMedia, MediaType } from '@app/models/media.model';
import { SettingsService } from '@app/services/settings.service';
import { MediaActionComponent } from "@app/components/media-action/media-action.component";
import { DropdownComponent } from "@app/components/dropdown/dropdown.component";
import { ApiSearchAddActionComponent } from "@app/components/api-search-add-action/api-search-add-action.component";
import { EntityService } from '@app/services/entity.service';

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [CommonModule, ActionBarComponent, MediaDetailsComponent, MediaActionComponent, DropdownComponent, ApiSearchAddActionComponent],
  templateUrl: './media-page.component.html',
  styleUrl: './media-page.component.css'
})
export class MediaPageComponent {
  id?: string;
  externalId?: string;
  error?: string;

  isLibraryMedia = isLibraryMedia;

  apiMedia = signal<ApiMedia | null>(null);
  libraryMedia = computed(() => {
    return this.entityService.getMedia(this.id!);
  });
  isMenuOpen = signal<boolean>(true);
  isLoading = computed(() => {
    return !this.libraryMedia() && !this.apiMedia();
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mediaService: MediaService,
    private settingsService: SettingsService,
    private entityService: EntityService
  ) {}

  async fromApiToLibrary() {
    const id = this.id;
    if (!id) return;

    this.apiMedia.set(null);

    try {
      this.entityService.getMedia(id, true);
      await this.router.navigate(['/media', id], { 
        replaceUrl: true 
      });
    } catch (e) {
      this.error = 'Error while reloading data';
      console.error(this.error, e);
    } finally {
      this.isMenuOpen.set(true);
    }
  }

  async ngOnInit() {
    const source = this.route.snapshot.paramMap.get('source');
    const type = this.route.snapshot.paramMap.get('type');
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error = 'Required id is not specified';
      throw new Error(this.error);
    }

    // load from api
    if (source && source === 'api' && type) {
      this.externalId = id;
      const mediaType = type as MediaType;
      this.apiMedia.set(
        await this.mediaService.getApiMediaById(id, mediaType, this.settingsService.language())
      );
    }
    // load from DB 
    else {
      this.id = id;
      this.entityService.getMedia(id, true);
    }
  }
}
