import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Directive, effect, EmbeddedViewRef, HostListener, inject, input, output, PLATFORM_ID, Renderer2, signal, TemplateRef, untracked, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appDropdownTrigger]',
  standalone: true
})
export class DropdownTriggerDirective {
  appDropdownTrigger = input.required<TemplateRef<any>>();

  private backdropElement: HTMLElement | null = null;
  private viewContainerRef = inject(ViewContainerRef);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private embeddedView: EmbeddedViewRef<any> | null = null;

  minWidth = input.required<number>();
  isOpenExternal = input.required<boolean>();
  isOpen = signal(false);

  opened = output<void>();
  closed = output<void>();

  constructor() {
    effect(() => {
      if (!this.isOpenExternal()) {
        untracked(() => this.close()); 
      }
    });
  }

  @HostListener('click', ['$event'])
  toggle(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isOpen() ? this.close() : this.open(event);
  }

  open(event: MouseEvent) {
    if (!this.isBrowser) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

    // create backdrop
    this.createBackdrop();

    // create the view to get its height
    this.embeddedView = this.viewContainerRef.createEmbeddedView(this.appDropdownTrigger());
    this.embeddedView.rootNodes.forEach((node: Node) => {
      this.renderer.appendChild(this.document.body, node);
    });
    this.embeddedView.detectChanges();
    const menuElement = this.embeddedView.rootNodes.find(
      (node) => node.nodeType === 1
    ) as HTMLElement;
    const menuDom = menuElement.classList.contains('dropdown-menu') 
      ? menuElement 
      : menuElement.querySelector('.dropdown-menu') as HTMLElement;
    if (!menuDom) {
      console.error("Can't find the .dropdown-menu element");
      return;
    }

    this.renderer.addClass(this.document.body, 'no-scroll');

    const container = this.embeddedView.rootNodes[0];

    this.renderer.setStyle(container, 'visibility', 'hidden');
    this.renderer.setStyle(container, 'display', 'inline-block');
    this.renderer.setStyle(container, 'position', 'fixed');

    const { width: actualWidth, height: actualHeight } = menuDom.getBoundingClientRect();
    const menuWidth = Math.min(actualWidth, 260); 
    const menuHeight = actualHeight;
    const padding = 5;

    // make menu appear at the right of the button
    let x = rect.right + menuWidth + padding; 
    // if it's outside on the right of view port, then go to the left
    if (x > window.innerWidth - padding) {
      x = rect.right - rect.width - padding; 
    }
    // if it's again outside, then place it as you can
    if (x - menuWidth < padding) {
      x = padding + menuWidth; 
    }

    // at the level of the buton
    let y = rect.top;
    // if it goes at the bottom of view port, then goes up
    if (y + menuHeight > window.innerHeight - padding) {
      let step = (y + menuHeight) - (window.innerHeight - padding);
      y -= step;
    }

    // move to be well placed
    this.renderer.setStyle(container, 'visibility', 'visible');
    this.renderer.setStyle(container, 'display', 'block');
    this.renderer.setStyle(container, 'transform', 'translate(-100%, 0)');
    // this.renderer.setStyle(container, 'width', `${menuWidth}px`);
    // this.renderer.setStyle(container, 'min-width', `${this.minWidth()}px`);
    this.renderer.setStyle(container, 'width', `auto`);
    this.renderer.setStyle(container, 'top', `${y}px`);
    this.renderer.setStyle(container, 'left', `${x}px`);
    this.renderer.setStyle(container, 'z-index', '9999');
    // add style
    this.renderer.addClass(container, 'dropdown-menu');

    this.isOpen.set(true);
    this.opened.emit();
  }

  private createBackdrop() {
    this.backdropElement = this.renderer.createElement('div');
    this.renderer.addClass(this.backdropElement, 'menu-backdrop');

    // style
    this.renderer.setStyle(this.backdropElement, 'position', 'fixed');
    this.renderer.setStyle(this.backdropElement, 'top', '0');
    this.renderer.setStyle(this.backdropElement, 'left', '0');
    this.renderer.setStyle(this.backdropElement, 'width', '100vw');
    this.renderer.setStyle(this.backdropElement, 'height', '100vh');
    this.renderer.setStyle(this.backdropElement, 'z-index', '9998');

    // close at click
    this.renderer.listen(this.backdropElement, 'click', (e: MouseEvent) => {
      e.stopPropagation();
      this.close();
    });

    this.renderer.appendChild(this.document.body, this.backdropElement);
  }

  close() {
    if (this.isBrowser) {
      this.renderer.removeClass(this.document.body, 'no-scroll');
    }

    if (this.backdropElement) {
      this.renderer.removeChild(this.document.body, this.backdropElement);
      this.backdropElement = null;
    }

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
