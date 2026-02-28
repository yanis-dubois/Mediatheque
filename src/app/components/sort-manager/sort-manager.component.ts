import { Component, computed, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder } from '@angular/cdk/drag-drop';

import { MediaOrder, MediaOrderDirection, MediaOrderField } from '@models/media-query.model';

import { DropdownTriggerDirective } from '@app/directive/dropdown.directive'
import { HumanizePipe } from '@app/pipe/humanize';

@Component({
  selector: 'app-sort-manager',
  standalone: true,
  imports: [CommonModule, HumanizePipe, DropdownTriggerDirective, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder
  ],
  templateUrl: './sort-manager.component.html',
  styleUrl: './sort-manager.component.css'
})
export class SortManagerComponent {

  sortOrder = model.required<MediaOrder[]>(); 

  private readonly ALL_FIELDS = Object.values(MediaOrderField);
  availableFields = computed(() => {
    const used = this.sortOrder().map(o => o.field);
    return this.ALL_FIELDS.filter(f => !used.includes(f));
  });

  getFieldsForIndex(index: number): MediaOrderField[] {
    const currentField = this.sortOrder()[index].field;
    return [...this.availableFields(), currentField];
  }

  canAddSort(): boolean {
    return this.sortOrder().length < this.ALL_FIELDS.length;
  }

  addSort() {
    const fields = this.availableFields();
    if (fields.length > 0) {
      this.sortOrder.update(s => [...s, { 
        field: fields[0],
        direction: MediaOrderDirection.DESC 
      }]);
    }
  }

  updateField(index: number, field: MediaOrderField) {
    this.sortOrder.update(s => {
      const newSort = [...s];
      newSort[index] = { ...newSort[index], field };
      return newSort;
    });
  }

  toggleDirection(index: number) {
    this.sortOrder.update(current => {
      const newSort = [...current];
      newSort[index] = { 
        ...newSort[index], 
        direction: newSort[index].direction === MediaOrderDirection.ASC 
        ? MediaOrderDirection.DESC 
        : MediaOrderDirection.ASC
      };
      return newSort;
    });
  }

  removeSort(index: number) {
    this.sortOrder.update(s => s.filter((_, i) => i !== index));
  }

  drop(event: CdkDragDrop<MediaOrder[]>) {
    this.sortOrder.update(currentSort => {
      const newSort = [...currentSort];
      moveItemInArray(newSort, event.previousIndex, event.currentIndex);
      return newSort;
    });
  }
}
