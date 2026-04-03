import {
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
} from '@angular/core';

@Directive({
  selector: '[tooltip]',
  host: {
    '(mouseenter)': 'onEnter()',
    '(mouseleave)': 'onLeave()',
  },
})
export class TooltipDirective implements OnDestroy {
  tooltip = input('');
  tooltipPosition = input<'top' | 'bottom' | 'left' | 'right'>('top');
  tooltipDelay = input(200);

  private el = inject(ElementRef);
  private tooltipEl: HTMLElement | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;

  onEnter() {
    this.showTimeout = setTimeout(() => this.show(), this.tooltipDelay());
  }

  onLeave() {
    if (this.showTimeout) clearTimeout(this.showTimeout);
    this.hide();
  }

  private show() {
    if (!this.tooltip()) return;

    this.tooltipEl = document.createElement('div');
    this.tooltipEl.textContent = this.tooltip();
    this.tooltipEl.className = [
      'fixed z-50 px-2 py-1 text-xs rounded',
      'bg-gray-900 text-white shadow-lg',
      'pointer-events-none whitespace-nowrap',
      'transition-opacity duration-150 opacity-0',
    ].join(' ');

    document.body.appendChild(this.tooltipEl);

    requestAnimationFrame(() => {
      this.position();
      this.tooltipEl?.classList.replace('opacity-0', 'opacity-100');
    });
  }

  private position() {
    if (!this.tooltipEl) return;
    const rect = this.el.nativeElement.getBoundingClientRect();
    const tip = this.tooltipEl.getBoundingClientRect();
    const gap = 6;

    let top = 0;
    let left = 0;

    switch (this.tooltipPosition()) {
      case 'top':
        top = rect.top - tip.height - gap;
        left = rect.left + rect.width / 2 - tip.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tip.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tip.height / 2;
        left = rect.left - tip.width - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tip.height / 2;
        left = rect.right + gap;
        break;
    }

    this.tooltipEl.style.top = `${top}px`;
    this.tooltipEl.style.left = `${left}px`;
  }

  private hide() {
    this.tooltipEl?.remove();
    this.tooltipEl = null;
  }

  ngOnDestroy() {
    if (this.showTimeout) clearTimeout(this.showTimeout);
    this.hide();
  }
}
