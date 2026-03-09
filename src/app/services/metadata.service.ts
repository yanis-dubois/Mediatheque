import { Injectable } from '@angular/core';

import { invoke } from '@tauri-apps/api/core';

import { Company, EntityType, MetadataType, Person, Saga, Tag } from '@app/models/entity.model';
import { CollectionMediaType } from '@app/models/collection.model';
import { MediaFilter, MediaOrder } from '@app/models/media-query.model';

@Injectable({ providedIn: 'root' })
export class MetadataService {

  /* get */

  async searchInMetadata(
    type: MetadataType, 
    id: number, 
    query: string, 
    order: MediaOrder[],
    filter: MediaFilter,
    context: CollectionMediaType
  ) {
    return await invoke<[string, number, number][]>('search_in_meta_data', { 
      metadataType: type, metadataId: id, query, order, filter, mediaType: context 
    });
  }

  async getMetadataLayout(type: MetadataType, query: string, context: CollectionMediaType): Promise<[string, EntityType][]> {
    return await invoke<[string, EntityType][]>('get_metadata_layout', { metadataType: type, query, context });
  }

  async getDescriptorRolesMap(type: MetadataType, id: number): Promise<Record<string, string[]>> {
    return await invoke<Record<string, string[]>>('get_all_roles_for_descriptor', {
      descriptorType: type, descriptorId: id
    });
  }

  async getPersonById(id: string): Promise<Person> {
    return await invoke<Person>('get_person_by_id', { id });
  }

  async getPersonBatch(ids: string[]): Promise<Person[]> {
    if (ids.length === 0) return [];
    return await invoke<Person[]>('get_person_batch', { ids });
  }

  async getCompanyById(id: string): Promise<Company> {
    return await invoke<Company>('get_company_by_id', { id });
  }

  async getCompanyBatch(ids: string[]): Promise<Company[]> {
    if (ids.length === 0) return [];
    return await invoke<Company[]>('get_company_batch', { ids });
  }

  async getSagaById(id: string): Promise<Saga> {
    return await invoke<Saga>('get_saga_by_id', { id });
  }

  async getSagaBatch(ids: string[]): Promise<Saga[]> {
    if (ids.length === 0) return [];
    return await invoke<Saga[]>('get_saga_batch', { ids });
  }

  async getGenreById(id: string): Promise<Tag> {
    return await invoke<Tag>('get_genre_by_id', { id });
  }

  async getGenreBatch(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    return await invoke<Tag[]>('get_genre_batch', { ids });
  }

  async getGameMechanicById(id: string): Promise<Tag> {
    return await invoke<Tag>('get_game_mechanic_by_id', { id });
  }

  async getGameMechanicBatch(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    return await invoke<Tag[]>('get_game_mechanic_batch', { ids });
  }

}
