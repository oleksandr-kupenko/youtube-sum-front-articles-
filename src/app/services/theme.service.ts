import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';
const CYCLE: Theme[] = ['system', 'light', 'dark'];
const COLOR_SCHEMES: Record<Theme, string> = {
  light: 'light',
  dark: 'dark',
  system: 'light dark',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  theme = signal<Theme>(this.load());

  constructor() {
    effect(() => this.apply(this.theme()));
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }

  cycle(): void {
    this.set(CYCLE[(CYCLE.indexOf(this.theme()) + 1) % CYCLE.length]);
  }

  private load(): Theme {
    if (!this.isBrowser) return 'system';
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? 'system';
  }

  private apply(theme: Theme): void {
    if (!this.isBrowser) return;
    document.documentElement.style.colorScheme = COLOR_SCHEMES[theme];
  }
}
