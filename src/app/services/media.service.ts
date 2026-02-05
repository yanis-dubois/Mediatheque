import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { ExternalMedia, Media, MediaStatus } from '@models/media.model';
import { Movie, Series } from '@models/media-details.model';
import { GetMediaOptions } from '@models/media-query.model';

@Injectable({ providedIn: 'root' })
export class MediaService {

  /* get media */

  getById(id: string): Promise<Media | Movie | Series> {
    return invoke<any>('get_media_by_id', { id });
  }

  /* get dynamic collection */

  getMediaList(options: GetMediaOptions = {}): Promise<Media[]> {
    const filter = options.filter ?? {};
    const order = options.order ?? [];
    const pagination = options.page ?? { limit: 100, offset: 0 };

    return invoke('get_media_list', { filter, order, pagination });
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
