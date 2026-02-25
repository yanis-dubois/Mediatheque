import { computed, Injectable, Signal, signal } from '@angular/core';
import { CollectionMediaType, compareCollectionMediaType } from '@app/models/collection.model';

import { invoke } from '@tauri-apps/api/core';

export interface PinEntry {
  collectionId: string;
  context: CollectionMediaType;
  position: number;
}

@Injectable({ providedIn: 'root' })
export class PinService {

  /* cache */

  private allPins = signal<PinEntry[]>([]);

  constructor() {
    this.refresh();
  }

  async refresh() {
    this.allPins.set(
      await invoke<PinEntry[]>('get_all_pins')
    );
  }

  removePinFromCache(id: string) {
    this.allPins.update(pins => pins.filter(p => p.collectionId !== id));
  }

  /* get */

  isPinned(id: string, context: CollectionMediaType): boolean {
    return this.allPins().some(p => 
      p.collectionId === id && compareCollectionMediaType(p.context, context)
    );
  }

  getPinnedCollectionIds(context: CollectionMediaType): Signal<string[]> {
    return computed(() => this.allPins()
      .filter(p => compareCollectionMediaType(p.context, context))
      .sort((a, b) => a.position - b.position)
      .map(p => p.collectionId));
  }

  /* update */

  async togglePin(id: string, context: CollectionMediaType) {
    const isPinned = this.isPinned(id, context);

    if (isPinned) {
      await invoke('unpin_collection', { collectionId: id, context });
    } else {
      await invoke('pin_collection', { collectionId: id, context });
    }

    await this.refresh();
  }

}
