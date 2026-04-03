import {
  AfterViewInit,
  Component,
  DOCUMENT,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgClass, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ErrorBlockComponent } from '../share/components/error-block';
import { TooltipDirective } from '../share/directives/tooltip.directive';
import { ArticlesBrowseService, DateRange } from './articles-browse.service';
import { ArticleListItem } from '../services/video-api.service';
import { environment } from '../../environments/environment';

const CATEGORY_ICONS: Record<string, string> = {
  science:       'M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L4.2 15.3m15.6 0-1.95 5.25a2.25 2.25 0 0 1-2.134 1.5H8.284a2.25 2.25 0 0 1-2.134-1.5L4.2 15.3m15.6 0h-15.6',
  health:        'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
  technology:    'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z',
  news:          'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3z',
  business:      'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z',
  education:     'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
  entertainment: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-17.25m17.25 0c.621 0 1.125.504 1.125 1.125v1.5',
  history:       'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  politics:      'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z',
  sports:        'M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0',
  culture:       'M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.038 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.038-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418',
  other:         'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z M6 6h.008v.008H6V6Z',
};

const DEFAULT_ICON = 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z M6 6h.008v.008H6V6Z';

const POPULAR_LANGS = ['en','es','ru','fr','de','pt','zh','ja','ko','ar','it','tr','hi'];

@Component({
  selector: 'app-articles-browse',
  templateUrl: './articles-browse.html',
  imports: [RouterLink, NgClass, TooltipDirective, ErrorBlockComponent],
  providers: [ArticlesBrowseService],
})
export class ArticlesBrowseComponent implements OnInit, AfterViewInit, OnDestroy {
  svc = inject(ArticlesBrowseService);

  private router     = inject(Router);
  private route      = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private meta       = inject(Meta);
  private titleSvc   = inject(Title);
  private doc        = inject(DOCUMENT);

  isMobile = signal(false);

  @ViewChild('sentinel') private sentinelRef?: ElementRef<HTMLElement>;

  private observer?:             IntersectionObserver;
  private routeSub?:             Subscription;
  private mql?:                  MediaQueryList;
  private ignoreNextRouteEvent = false;
  private isFirstLoad          = true;

  constructor() {
    effect(() => { this.injectJsonLd(this.svc.articles()); });
  }

  // Page numbers for desktop pagination (with ellipsis)
  pageNumbers = computed<(number | '...')[]>(() => {
    const total   = this.svc.totalPages();
    const current = this.svc.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  readonly dateRanges: { id: DateRange; label: string }[] = [
    { id: 'any',   label: 'Any time'    },
    { id: 'week',  label: 'This week'   },
    { id: 'month', label: 'This month'  },
    { id: '3mo',   label: '3 months'    },
    { id: 'year',  label: 'This year'   },
  ];

  readonly popularLangs = POPULAR_LANGS;

  extraLangs = computed(() =>
    this.svc.availableLangs().filter(l => !POPULAR_LANGS.includes(l))
  );

  ngOnInit() {
    this.titleSvc.setTitle('YouTube Summarized Articles — Browse AI Summaries');
    this.meta.updateTag({ name: 'description', content: 'Browse hundreds of AI-generated summaries of YouTube videos. Filter by topic, language, and date. Read structured articles extracted from any YouTube video.' });
    this.meta.updateTag({ property: 'og:title',       content: 'YouTube Summarized Articles — Browse AI Summaries' });
    this.meta.updateTag({ property: 'og:description', content: 'Browse hundreds of AI-generated summaries of YouTube videos. Filter by topic, language, and date.' });
    this.meta.updateTag({ property: 'og:url',         content: 'https://unwatched.click/youtube-summarized-articles' });
    this.meta.updateTag({ property: 'og:type',        content: 'website' });
    this.meta.updateTag({ name: 'twitter:title',       content: 'YouTube Summarized Articles — Browse AI Summaries' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Browse hundreds of AI-generated summaries of YouTube videos. Filter by topic, language, and date.' });
    this.setCanonical('https://unwatched.click/youtube-summarized-articles');

    // Mobile detection (must happen before route subscription so isMobile() is ready)
    if (isPlatformBrowser(this.platformId)) {
      this.mql = window.matchMedia('(max-width: 639px)');
      this.isMobile.set(this.mql.matches);
      this.mql.addEventListener('change', this.onMqlChange);
    }

    // Route-based pagination (desktop + SSR)
    this.routeSub = this.route.queryParams.subscribe(params => {
      if (this.ignoreNextRouteEvent) { this.ignoreNextRouteEvent = false; return; }
      // Mobile browser uses infinite scroll — URL does not drive pagination
      if (isPlatformBrowser(this.platformId) && this.isMobile()) return;
      const page = Math.max(1, parseInt(params['page'] || '1', 10));
      this.svc.setPage(page);
      if (isPlatformBrowser(this.platformId) && !this.isFirstLoad) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      this.isFirstLoad = false;
    });

    // Mobile browser: load first page directly (not via URL)
    if (isPlatformBrowser(this.platformId) && this.isMobile()) {
      this.svc.loadArticles();
    }

    this.svc.loadCategories();
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.setupObserver();
  }

  ngOnDestroy() {
    this.removeJsonLd();
    this.routeSub?.unsubscribe();
    this.observer?.disconnect();
    this.mql?.removeEventListener('change', this.onMqlChange);
  }

  // --- Filter wrappers (also reset URL page on desktop) ---

  setCategory(slug: string | null) {
    this.svc.setCategory(slug);
    this.resetUrlPage();
  }

  setLang(lang: string | null) {
    this.svc.setLang(lang);
    this.resetUrlPage();
  }

  setDate(range: DateRange) {
    this.svc.setDate(range);
    this.resetUrlPage();
  }

  setVideoDate(range: DateRange) {
    this.svc.setVideoDate(range);
    this.resetUrlPage();
  }

  clearFilters() {
    this.svc.clearFilters();
    this.resetUrlPage();
  }

  goToPage(n: number) {
    this.router.navigate([], { queryParams: { page: n }, queryParamsHandling: 'merge' });
  }

  // --- Helpers ---

  categoryIcon(slug: string): string {
    return CATEGORY_ICONS[slug] ?? DEFAULT_ICON;
  }

  langLabel(code: string): string {
    try {
      return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
    } catch {
      return code;
    }
  }

  articleQueryParams(a: ArticleListItem): Record<string, string> {
    const p: Record<string, string> = { v: a.videoId, lang: a.articleLang };
    if (a.sourceLang && a.sourceLang !== a.articleLang) p['sourceLang'] = a.sourceLang;
    return p;
  }

  previewUrl(a: ArticleListItem): string {
    if (a.previewImage) return `${environment.apiUrl}${a.previewImage}`;
    return `https://img.youtube.com/vi/${a.videoId}/hqdefault.jpg`;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  injectJsonLd(articles: ArticleListItem[]) {
    if (articles.length === 0) { this.removeJsonLd(); return; }
    this.removeJsonLd();
    const script = this.doc.createElement('script');
    script.id   = 'articles-browse-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'YouTube Summarized Articles',
      description: 'AI-generated summaries of YouTube videos',
      url: 'https://unwatched.click/youtube-summarized-articles',
      hasPart: articles.slice(0, 10).map(a => ({
        '@type': 'Article',
        headline: a.title ?? a.videoTitle,
        description: a.metaDescription ?? a.intro ?? '',
        url: `https://unwatched.click/summary?v=${a.videoId}&lang=${a.articleLang}`,
        image: this.previewUrl(a),
        datePublished: a.createdAt,
        inLanguage: a.articleLang,
      })),
    });
    this.doc.head.appendChild(script);
  }

  // --- Private ---

  private setupObserver() {
    if (!this.isMobile() || !this.sentinelRef) return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !this.svc.loading() && !this.svc.loadingMore()) {
          this.svc.loadMore();
        }
      },
      { rootMargin: '400px' }, // start loading before user reaches the bottom
    );
    this.observer.observe(this.sentinelRef.nativeElement);
  }

  private onMqlChange = (e: MediaQueryListEvent) => {
    this.isMobile.set(e.matches);
    if (e.matches) {
      this.setupObserver();
    } else {
      this.observer?.disconnect();
      this.observer = undefined;
    }
  };

  private resetUrlPage() {
    if (this.isMobile()) return;
    this.ignoreNextRouteEvent = true;
    this.router.navigate([], { queryParams: { page: 1 }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  private setCanonical(href: string) {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private removeJsonLd() {
    this.doc.getElementById('articles-browse-jsonld')?.remove();
  }
}
