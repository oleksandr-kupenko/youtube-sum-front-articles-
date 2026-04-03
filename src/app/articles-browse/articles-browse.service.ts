import { Injectable, inject, signal, computed } from '@angular/core';
import { VideoApiService, ArticleListItem, ArticleCategoryWithCount } from '../services/video-api.service';

export type DateRange = 'any' | 'week' | 'month' | '3mo' | 'year';

@Injectable()
export class ArticlesBrowseService {
  private api = inject(VideoApiService);

  readonly PAGE_SIZE = 12;

  // Filter state
  selectedCategory  = signal<string | null>(null);
  selectedLang      = signal<string | null>(null);
  selectedDate      = signal<DateRange>('any');
  selectedVideoDate = signal<DateRange>('any');
  currentPage       = signal(1);

  // Data state
  articles         = signal<ArticleListItem[]>([]);
  total            = signal(0);
  categories       = signal<ArticleCategoryWithCount[]>([]);
  loading          = signal(false);
  error            = signal<string | null>(null);

  totalPages  = computed(() => Math.max(1, Math.ceil(this.total() / this.PAGE_SIZE)));
  loadingMore = signal(false);
  hasMore     = computed(() => this.currentPage() < this.totalPages() && this.total() > 0);

  // Unique langs that appear in the current full result set
  private _availableLangs = signal<string[]>([]);
  availableLangs = this._availableLangs.asReadonly();

  loadCategories() {
    this.api.getArticleCategories().subscribe({
      next: cats => this.categories.set(cats.filter(c => c.count > 0)),
      error: () => {},
    });
  }

  loadArticles(resetPage = false) {
    if (resetPage) this.currentPage.set(1);
    this.loading.set(true);
    this.error.set(null);

    const { dateFrom } = this.dateRangeToParams(this.selectedDate());
    const { dateFrom: videoPublishedFrom } = this.dateRangeToParams(this.selectedVideoDate());

    this.api.getArticles({
      page:               this.currentPage(),
      limit:              this.PAGE_SIZE,
      category:           this.selectedCategory() ?? undefined,
      lang:               this.selectedLang() ?? undefined,
      dateFrom,
      videoPublishedFrom,
    }).subscribe({
      next: res => {
        this.articles.set(res.articles);
        this.total.set(res.total);
        this.loading.set(false);
        // Collect unique langs for dropdown
        const langs = [...new Set(res.articles.map(a => a.articleLang))];
        this._availableLangs.set(langs);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load articles');
      },
    });
  }

  setCategory(slug: string | null) {
    this.selectedCategory.set(slug);
    this.loadArticles(true);
  }

  setLang(lang: string | null) {
    this.selectedLang.set(lang);
    this.loadArticles(true);
  }

  setDate(range: DateRange) {
    this.selectedDate.set(range);
    this.loadArticles(true);
  }

  setVideoDate(range: DateRange) {
    this.selectedVideoDate.set(range);
    this.loadArticles(true);
  }

  clearFilters() {
    this.selectedCategory.set(null);
    this.selectedLang.set(null);
    this.selectedDate.set('any');
    this.selectedVideoDate.set('any');
    this.loadArticles(true);
  }

  setPage(page: number) {
    // Only clamp if total is already known; on first load total=0 so we must not clamp
    const clamped = this.total() > 0
      ? Math.max(1, Math.min(page, this.totalPages()))
      : Math.max(1, page);
    this.currentPage.set(clamped);
    this.loadArticles(false);
  }

  loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    const nextPage = this.currentPage() + 1;
    this.currentPage.set(nextPage);
    this.loadingMore.set(true);

    const { dateFrom } = this.dateRangeToParams(this.selectedDate());
    const { dateFrom: videoPublishedFrom } = this.dateRangeToParams(this.selectedVideoDate());

    this.api.getArticles({
      page:               nextPage,
      limit:              this.PAGE_SIZE,
      category:           this.selectedCategory() ?? undefined,
      lang:               this.selectedLang() ?? undefined,
      dateFrom,
      videoPublishedFrom,
    }).subscribe({
      next: res => {
        this.articles.update(existing => [...existing, ...res.articles]);
        this.total.set(res.total);
        this.loadingMore.set(false);
      },
      error: () => {
        this.currentPage.set(nextPage - 1);
        this.loadingMore.set(false);
      },
    });
  }

  private dateRangeToParams(range: DateRange): { dateFrom?: string } {
    if (range === 'any') return {};
    const days = ({ week: 7, month: 30, '3mo': 90, year: 365 } as Record<DateRange, number>)[range];
    const from = new Date(Date.now() - days * 86_400_000);
    return { dateFrom: from.toISOString() };
  }
}
