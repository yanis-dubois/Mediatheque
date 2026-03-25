import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

import { ActionBarComponent } from '@components/action-bar/action-bar.component';
import { MediaDetailsComponent } from '@components/media-details/media-details.component';
import { ApiMedia, isLibraryMedia, MediaSource, MediaType } from '@app/models/media.model';
import { MediaActionComponent } from "@app/components/media-action/media-action.component";
import { DropdownComponent } from "@app/components/dropdown/dropdown.component";
import { ApiSearchActionComponent } from "@app/components/api-search-action/api-search-action.component";
import { EntityService } from '@app/services/entity.service';
import { Subscription } from 'rxjs';
import { ApiService } from '@app/services/api.service';

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [CommonModule, ActionBarComponent, MediaDetailsComponent, MediaActionComponent, DropdownComponent, ApiSearchActionComponent],
  templateUrl: './media-page.component.html',
  styleUrl: './media-page.component.css'
})
export class MediaPageComponent {
  private subscription = new Subscription();

  id = signal<string | null>(null);
  externalId?: string;
  error?: string;

  isLibraryMedia = isLibraryMedia;

  apiMedia = signal<ApiMedia | null>(null);
  libraryMedia = computed(() => {
    return this.entityService.getMedia(this.id()!);
  });
  isMenuOpen = signal<boolean>(true);
  isLoading = computed(() => {
    return !this.libraryMedia() && !this.apiMedia();
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService,
    private entityService: EntityService
  ) {}

  async fromApiToLibrary() {
    const id = this.id();
    if (!id) return;

    this.apiMedia.set(null);

    try {
      this.entityService.getMedia(id, true);
      await this.router.navigate(['/search/media', id], { 
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
    const type = this.route.snapshot.paramMap.get('type');
    const source = this.route.snapshot.paramMap.get('source');
    const isInLibrary_str = this.route.snapshot.paramMap.get('isInLibrary');
    const id = this.route.snapshot.paramMap.get('id');

    const isInLibrary = isInLibrary_str === 'true';

    if (!id) {
      this.error = 'Required id is not specified';
      throw new Error(this.error);
    }

    // load from api
    if (source && type) {
      this.externalId = id;
      const mediaType = type as MediaType;
      const apiSource = source as MediaSource;
      const apiMedia = await this.apiService.getById(id, mediaType, apiSource);
      this.apiMedia.set({...apiMedia, isInLibrary: isInLibrary});
    }
    // load from DB 
    else {
      this.id.set(id);
      const res = this.entityService.getMedia(id, true);
      if (!res) {
        this.router.navigate(['/']);
      }
    }

    this.subscription.add(
      this.entityService.mediaInserted$.subscribe((media) => {
        const currentApi = this.apiMedia();

        // switch to LibraryMedia view
        if (currentApi && media.externalId?.toString() === currentApi.externalId.toString()) {
          this.id.set(media.id);
          this.apiMedia.set(null);
          this.router.navigate(['/media', media.id], { replaceUrl: true });
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
