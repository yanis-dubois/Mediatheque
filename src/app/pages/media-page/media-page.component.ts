import { Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@components/action-bar/action-bar.component';
import { MediaDetailsComponent } from '@components/media-details/media-details.component';
import { MediaService } from '@app/services/media.service';
import { DetailedMedia, isLibraryMedia, MediaType } from '@app/models/media.model';
import { SettingsService } from '@app/services/settings.service';
import { MediaActionComponent } from "@app/components/media-action/media-action.component";
import { DropdownComponent } from "@app/components/dropdown/dropdown.component";
import { ApiSearchAddActionComponent } from "@app/components/api-search-add-action/api-search-add-action.component";

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [CommonModule, ActionBarComponent, MediaDetailsComponent, MediaActionComponent, DropdownComponent, ApiSearchAddActionComponent],
  templateUrl: './media-page.component.html',
  styleUrl: './media-page.component.css'
})
export class MediaPageComponent {
  id?: string;
  error?: string;

  isLibraryMedia = isLibraryMedia;

  media = signal<DetailedMedia | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mediaService: MediaService,
    private settingsService: SettingsService
  ) {
  }

  async loadData(id: string) {
    this.media.set(
      await this.mediaService.getById(id)
    );
    await this.router.navigate(['/media', id], { 
      replaceUrl: true 
    });
  }

  async ngOnInit() {
    const source = this.route.snapshot.paramMap.get('source');
    const type = this.route.snapshot.paramMap.get('type');
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error = 'Required id not specified';
      throw new Error(this.error);
    }
    this.id = id;

    if (source && source === 'api' && type) {
      const mediaType = type as MediaType;
      this.media.set(
        await this.mediaService.getApiMediaById(id, mediaType, this.settingsService.language())
      );
    } else {
      this.media.set(
        await this.mediaService.getById(id)
      );
    }
  }
}
