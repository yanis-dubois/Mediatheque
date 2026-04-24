import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-generic-picker',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './generic-picker.component.html',
  styleUrl: './generic-picker.component.scss'
})
export class GenericPickerComponent {

  title = input.required<string>();
  resultCount = input<number>(0);
  showSearch = input<boolean>(true);
  searchPlaceholder = input<string>("Search...");
  allowEmpty = input<boolean>(true);

  onCancel = output<void>();
  onConfirm = output<Set<string>>();
  searchChange = output<string>();

  selectedIds = signal<Set<string>>(new Set());
  searchQuery = signal('');

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.searchChange.emit(query);
  }

  toggleSelection(id: string) {
    this.selectedIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  getSelectionIcon(id: string): string {
    return this.selectedIds().has(id) ? '✅' : '⚪';
  }

}
