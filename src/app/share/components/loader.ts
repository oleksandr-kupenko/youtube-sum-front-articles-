import { Component, input } from '@angular/core';

export type LoaderSize = 'sm' | 'md' | 'lg';

const SIZE: Record<LoaderSize, { ring: number; icon: number }> = {
  sm: { ring: 48, icon: 18 },
  md: { ring: 80, icon: 28 },
  lg: { ring: 112, icon: 40 },
};

@Component({
  selector: 'app-loader',
  host: { class: 'flex flex-col items-center gap-4' },
  template: `
    <div class="loader-ring" [style.width.px]="dim().ring" [style.height.px]="dim().ring">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle class="track" cx="32" cy="32" r="28" stroke-width="3"/>
        <circle class="spin"  cx="32" cy="32" r="28" stroke-width="3" stroke-linecap="round"/>
      </svg>
      <div class="play-icon" [style.width.px]="dim().icon" [style.height.px]="dim().icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
          <path d="M8 5.14v14l11-7-11-7z"/>
        </svg>
      </div>
    </div>

    @if (label()) {
      <p class="text-[var(--color-fg-muted)] text-sm tracking-wide">{{ label() }}</p>
    }
  `,
  styles: [`
    .loader-ring {
      position: relative;
      flex-shrink: 0;
    }
    .loader-ring svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .loader-ring .track {
      stroke: color-mix(in srgb, #dc2626 15%, transparent);
    }
    .loader-ring .spin {
      stroke: #ef4444;
      stroke-dasharray: 60 116;
      animation: loader-spin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    .play-icon {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ef4444;
      animation: loader-pulse 1.4s ease-in-out infinite;
    }
    @keyframes loader-spin {
      0%   { stroke-dashoffset: 0;    transform: rotate(0deg); }
      50%  { stroke-dasharray: 90 86; }
      100% { stroke-dashoffset: -176; transform: rotate(0deg); }
    }
    @keyframes loader-pulse {
      0%, 100% { opacity: 1;    transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.85); }
    }
  `],
})
export class LoaderComponent {
  size  = input<LoaderSize>('md');
  label = input<string>('');

  protected dim() { return SIZE[this.size()]; }
}
