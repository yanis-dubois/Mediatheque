import { Directive, ElementRef, HostListener, input } from '@angular/core';

@Directive({
  selector: '[appNumericRange]',
  standalone: true
})
export class NumericRangeDirective {
  min = input<number>(0);
  max = input<number>(100);

  constructor(private el: ElementRef<HTMLElement>) {}

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Tab', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'Delete', 'Enter', 'Escape'];
    if (allowedKeys.includes(event.key)) return;

    // Bloquer si ce n'est pas un chiffre
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    // Calculer la valeur future pour vérifier la contrainte
    const currentText = this.el.nativeElement.innerText;
    const selection = window.getSelection();
    const futureValue = this.predictValue(currentText, event.key, selection);

    if (parseInt(futureValue, 10) > this.max()) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const data = event.clipboardData?.getData('text');
    if (!data || !/^\d+$/.test(data)) {
      event.preventDefault();
    }
  }

  private predictValue(current: string, key: string, selection: Selection | null): string {
    const cleanedCurrent = current.replace(/[\D\s]/g, '');

    if (!selection || selection.rangeCount === 0) return cleanedCurrent + key;
    const range = selection.getRangeAt(0);
    const start = range.startOffset;
    const end = range.endOffset;

    return cleanedCurrent.slice(0, start) + key + cleanedCurrent.slice(end);
  }
}
