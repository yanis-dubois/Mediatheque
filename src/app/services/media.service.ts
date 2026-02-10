import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { ExternalMedia, Media, MediaStatus } from '@models/media.model';
import { Movie, Series } from '@models/media-details.model';

@Injectable({ providedIn: 'root' })
export class MediaService {

  /* get media */

  getById(id: string): Promise<Media | Movie | Series> {
    return invoke<any>('get_media_by_id', { id });
  }

  /* update media */

  toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    return invoke('toggle_media_favorite', { id, isFavorite });
  }

  updateStatus(id: string, status: MediaStatus): Promise<void> {
    return invoke('update_media_status', { id, status });
  }

  updateNotes(id: string, notes: string): Promise<void> {
    return invoke('update_media_notes', { id, notes });
  }

  /* add media */

  addToLibrary(media: ExternalMedia): Promise<void> {
    return invoke('add_media_to_library', { data: media });
  }
}
