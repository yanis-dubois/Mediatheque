import { Directive, ElementRef, output, HostListener, inject, signal } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  private el = inject(ElementRef);
  
  clickOutside = output<void>();

  @HostListener('document:click', ['$event.target'])
    public onClick(target: EventTarget | null) {
    if (target && !this.el.nativeElement.contains(target as Node)) {
      this.clickOutside.emit();
    }
  }
}
