import { Injectable, signal } from '@angular/core';
import { CollectionMediaType, compareCollectionMediaType } from '@app/models/collection.model';
import { MediaType } from '@app/models/media.model';

import { invoke } from '@tauri-apps/api/core';

export interface PinEntry {
  collectionId: string;
  context: CollectionMediaType;
  position: number;
}

@Injectable({ providedIn: 'root' })
export class PinService {

  /* cache */

  readonly allPins = signal<PinEntry[]>([]);

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

  checkPinIncompatibility(id: string, newMediaType: MediaType | undefined): CollectionMediaType | null {
    const incompatiblePin = this.allPins().find(p => 
      p.collectionId === id && 
      p.context.type === 'SPECIFIC' && 
      p.context.value !== newMediaType
    );
    return incompatiblePin ? incompatiblePin.context : null;
  }

  getPinnedIds(context: CollectionMediaType): string[] {
    return this.allPins()
      .filter(p => compareCollectionMediaType(p.context, context))
      .sort((a, b) => a.position - b.position)
      .map(p => p.collectionId);
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

  async updatePinnedOrder(ids: string[], context: CollectionMediaType) {
    try {
      await invoke('update_pinned_collections', { collectionIds: ids, context: context });
    } catch (e) {
      console.error("Error while updating pin order", e);
    }

    await this.refresh();
  }

  async removeIncompatiblePins(collectionId: string, newType: CollectionMediaType) {
    const pinsToRemove = this.allPins().filter(p => {
      if (p.collectionId !== collectionId) return false;
      // pinned to ALL is not a problem
      if (p.context.type === 'ALL') return false;
      // pinned to specific and changed to ALL
      if (newType.type === 'ALL') return true;
      // pinned to specific and changed to another specific
      return newType.type === 'SPECIFIC' && p.context.value !== newType.value;
    });

    for (const pin of pinsToRemove) {
      await invoke('unpin_collection', { collectionId, context: pin.context });
    }

    if (pinsToRemove.length > 0) {
      await this.refresh();
    }
  }

}
