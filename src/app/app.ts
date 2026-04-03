import { Component, inject, signal, viewChild, AfterViewInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { LoaderComponent } from './share/components/loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  protected themeSvc = inject(ThemeService);
  protected currentYear = new Date().getFullYear();
  protected isAppLoading = signal(true);

  private outlet = viewChild(RouterOutlet);

  ngAfterViewInit() {
    this.outlet()?.activateEvents.subscribe(() => {
      this.isAppLoading.set(false);
    });
  }
}
