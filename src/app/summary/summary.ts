import { Component, inject, OnInit, OnDestroy, signal, effect, DOCUMENT } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { SummaryService } from './summary.service';
import { SummaryViewComponent } from '../summary-view/summary-view';
import { ErrorBlockComponent } from '../share/components/error-block';
import { VideoFlowService } from '../video-flow.service';
import { SummaryLength } from './summary-length';
import { environment } from '../../environments/environment';

export type ActiveTab = SummaryLength | 'subtitles';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.html',
  imports: [SummaryViewComponent, ErrorBlockComponent],
  providers: [SummaryService],
})
export class SummaryComponent implements OnInit, OnDestroy {
  svc      = inject(SummaryService);
  flow     = inject(VideoFlowService);
  private route    = inject(ActivatedRoute);
  private meta     = inject(Meta);
  private titleSvc = inject(Title);
  private doc      = inject(DOCUMENT);

  readonly lengthTabs: { id: SummaryLength; label: string }[] = [
    { id: 'full', label: 'Full' },
    { id: 'medium', label: 'Medium' },
    { id: 'brief', label: 'Brief' },
  ];

  activeTab = signal<ActiveTab>('medium');

  constructor() {
    effect(() => this.activeTab.set(this.svc.activeLength()));
  }

  ngOnDestroy() {
    this.titleSvc.setTitle('YouTube Summary — AI-powered video summaries & transcripts');
    this.meta.updateTag({ name: 'description', content: 'Paste any YouTube link and get a structured article, bullet-point summary, or a quick takeaway — powered by AI. Includes a full clickable transcript with timestamps.' });
    this.meta.updateTag({ property: 'og:url',    content: 'https://unwatched.click/' });
    this.meta.updateTag({ property: 'og:image',  content: 'https://unwatched.click/og-image.png' });
    this.meta.updateTag({ name: 'twitter:image', content: 'https://unwatched.click/og-image.png' });
    this.meta.updateTag({ property: 'og:locale', content: 'en_US' });
    this.setCanonical('https://unwatched.click/');
    this.doc.documentElement.lang = 'en';
  }

  ngOnInit() {
    const params = this.route.snapshot.queryParams;
    const videoId = params['v'] ?? '';
    const lang = params['lang'] ?? '';
    const rawLength = params['length'];
    const length: SummaryLength = ['full', 'medium', 'brief'].includes(rawLength) ? rawLength : 'medium';
    const sourceLang = params['sourceLang'] as string | undefined;

    this.activeTab.set(length);

    // Set document language from URL param — always available, even if resolver returned null
    if (lang) {
      this.doc.documentElement.lang = lang;
      this.meta.updateTag({ property: 'og:locale', content: toOgLocale(lang) });
    }

    // SSR: set full meta from resolved data (available synchronously in ngOnInit)
    const pageData = (this.route.snapshot.data as any)['pageData'];
    if (pageData) {
      this.applyPageMeta(pageData);
    }

    this.svc.init(videoId, lang, length, sourceLang);
  }

  private applyPageMeta(data: { pageTitle: string; metaDescription: string | null; previewImage: string | null; videoTitle: string; videoId: string; lang: string }) {
    const title = data.pageTitle;
    if (title) {
      this.titleSvc.setTitle(`${title} | YouTube Summary`);
      this.meta.updateTag({ name: 'twitter:title', content: title });
      this.meta.updateTag({ property: 'og:title', content: title });
    }

    if (data.metaDescription) {
      this.meta.updateTag({ name: 'description', content: data.metaDescription });
      this.meta.updateTag({ property: 'og:description', content: data.metaDescription });
      this.meta.updateTag({ name: 'twitter:description', content: data.metaDescription });
    }

    const imgUrl = data.previewImage
      ? `${environment.apiUrl}${data.previewImage}`
      : `https://img.youtube.com/vi/${data.videoId}/hqdefault.jpg`;
    this.meta.updateTag({ property: 'og:image', content: imgUrl });
    this.meta.updateTag({ name: 'twitter:image', content: imgUrl });

    const pageUrl = `https://unwatched.click/summary?v=${data.videoId}&lang=${data.lang}`;
    this.meta.updateTag({ property: 'og:url', content: pageUrl });
    this.meta.updateTag({ name: 'twitter:url', content: pageUrl });
    this.setCanonical(pageUrl);

    // Set document language to match article content language
    this.doc.documentElement.lang = data.lang;
    this.meta.updateTag({ property: 'og:locale', content: toOgLocale(data.lang) });
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

  switchTab(tab: ActiveTab) {
    this.activeTab.set(tab);
    if (tab !== 'subtitles') {
      this.svc.switchLength(tab);
    }
  }
}

function toOgLocale(lang: string): string {
  if (lang.includes('-')) return lang.replace('-', '_');
  const map: Record<string, string> = {
    en: 'en_US', de: 'de_DE', fr: 'fr_FR', es: 'es_ES',
    it: 'it_IT', pt: 'pt_BR', ru: 'ru_RU', zh: 'zh_CN',
    ja: 'ja_JP', ko: 'ko_KR', ar: 'ar_SA', nl: 'nl_NL',
    pl: 'pl_PL', sv: 'sv_SE', tr: 'tr_TR', uk: 'uk_UA',
    hi: 'hi_IN', id: 'id_ID', cs: 'cs_CZ', ro: 'ro_RO',
  };
  return map[lang] ?? `${lang}_${lang.toUpperCase()}`;
}
