import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, effect, inject, input, output, PLATFORM_ID, Renderer2, signal, TemplateRef, untracked, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss'
})
export class DropdownComponent {
  @ViewChild('menuTemplate') menuTemplate!: TemplateRef<any>;

  private viewContainerRef = inject(ViewContainerRef);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private embeddedView: any = null;

  customClass = input<string>('dots-btn');
  isOpenExternal = input.required<boolean>();
  isOpen = signal(false);
  position = signal({ x: 0, y: 0 });

  opened = output<void>();
  closed = output<void>();

  constructor() {
    effect(() => {
      if (!this.isOpenExternal()) {
        untracked(() => this.close()); 
      }
    });
  }

  toggle(event: MouseEvent) {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open(event);
    }
  }

  open(event: MouseEvent) {
    if (!this.isBrowser || !this.menuTemplate) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    // create the view to get its height
    this.embeddedView = this.viewContainerRef.createEmbeddedView(this.menuTemplate);
    this.embeddedView.rootNodes.forEach((node: Node) => {
      this.renderer.appendChild(this.document.body, node);
    });
    this.embeddedView.detectChanges();
    const menuElement = this.embeddedView.rootNodes.find(
      (node: any) => node.classList?.contains('fixed-menu-overlay') || node.querySelector?.('.dropdown-menu')
    );
    const menuDom = menuElement?.querySelector('.dropdown-menu') || menuElement;
    const { width: actualWidth, height: actualHeight } = menuDom.getBoundingClientRect();

    const menuWidth = 180; 
    const menuHeight = actualHeight;
    const padding = 5;

    // make menu appear at the right of the button
    let x = rect.right + menuWidth + padding; 

    // if it's outside on the right of view port, then go to the left
    if (x > window.innerWidth - padding) {
      x = rect.right - rect.width - padding; 
    }

    // at the level of the buton
    let y = rect.top;

    // if it goes at the bottom of view port, then goes up
    if (y + menuHeight > window.innerHeight - padding) {
      let step = (y + menuHeight) - (window.innerHeight - padding);
      y -= step;
    }

    // move to be well placed
    this.position.set({ x: x, y: y });

    this.isOpen.set(true);
    this.opened.emit();
  }

  close() {
    if (this.embeddedView) {
      this.embeddedView.destroy();
      this.embeddedView = null;
    }
    this.isOpen.set(false);
    this.closed.emit();
  }

  ngOnDestroy() {
    this.close();
  }

  closeWithBackdrop(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    this.close();
  }

}
