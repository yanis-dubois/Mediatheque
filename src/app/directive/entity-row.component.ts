import { computed, contentChild, Directive, ElementRef, inject, input } from '@angular/core';

import { EntityService } from '@app/services/entity.service';
import { DetailedEntity, EntityType } from '@app/models/entity.model';

@Directive()
export abstract class EntityRow<T extends DetailedEntity> {
  entityId = input.required<string>();
  width = input.required<number>();
  height = input.required<number>();
  isMenuOpen = input.required<boolean>();
  display = input<string>('default');

  customIcon = contentChild<ElementRef>('icon');

  private entityService = inject(EntityService);
  abstract type: EntityType;

  entity = computed(() => {
    const id = this.entityId();
    return id ? (this.entityService.getEntitySignal(this.type, id)() as T | null) : null;
  });
}
