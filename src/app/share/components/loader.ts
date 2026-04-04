import { Component, input } from '@angular/core';

export type LoaderSize = 'sm' | 'md' | 'lg';

const SIZE: Record<LoaderSize, number> = {
  sm: 64,
  md: 120,
  lg: 150,
};

@Component({
  selector: 'app-loader',
  host: { class: 'flex flex-col items-center gap-4' },
  standalone: true,
  template: `
    <div class="loader" [style.--sz.px]="px()">
      <div class="box-1"></div>
    </div>

    @if (label()) {
      <p class="loader-label">{{ label() }}</p>
    }
  `,
  styles: [`
    .loader {
      position: relative;
    }

    .box-1 {
      position: relative;
      height: var(--sz, 120px);
      width: var(--sz, 120px);
      background-color: #ffffff;
      background-image: linear-gradient(135deg, #ffffff 0%, #6284ff 34%, #ff0000 100%);
      border-radius: 50%;
      animation: rotate 3s linear infinite;
      box-shadow: rgba(17, 17, 26, 0.1) 0px 1px 0px,
                  rgba(17, 17, 26, 0.1) 0px 8px 24px,
                  rgba(17, 17, 26, 0.1) 0px 16px 48px;
    }

    @keyframes rotate {
      0%   { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .box-1::before {
      content: '';
      position: absolute;
      inset: 10%;
      background: var(--color-bg, #f5f5f5);
      border-radius: 50%;
    }

    .loader-label {
      color: var(--color-fg-muted, #666);
      font-size: 0.875rem;
      letter-spacing: 0.05em;
      text-align: center;
    }
  `],
})
export class LoaderComponent {
  size  = input<LoaderSize>('md');
  label = input<string>('');

  protected px() { return SIZE[this.size()]; }
}
