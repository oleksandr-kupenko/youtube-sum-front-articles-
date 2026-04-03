import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { VideoApiService, TranscriptSnippet, VisualTimecode, ArticleVariant, ApiError } from '../services/video-api.service';
import { VideoFlowService } from '../video-flow.service';
import { SummaryLength } from './summary-length';
import { getHeadings } from './headings';

export type VariantStatus = ArticleVariant | null | 'loading';
export type InitPhase = 'loading' | 'done' | 'error';

export interface VariantMap {
  full: VariantStatus;
  medium: VariantStatus;
  brief: VariantStatus;
}

@Injectable()
export class SummaryService implements OnDestroy {
  private api = inject(VideoApiService);
  private flow = inject(VideoFlowService);
  private router = inject(Router);

  initPhase = signal<InitPhase>('loading');

  videoId = signal('');
  lang = signal('');
  sourceLang = signal<string | undefined>(undefined);
  videoUrl = signal('');
  videoTitle = signal('');
  metaTitle = signal<string | null>(null);
  metaDescription = signal<string | null>(null);
  previewImage = signal<string | null>(null);
  videoDuration = signal<number | null>(null);
  videoPublishedAt = signal<string | null>(null);
  articleCreatedAt = signal<string | null>(null);

  variants = signal<VariantMap>({ full: null, medium: null, brief: null });
  activeLength = signal<SummaryLength>('medium');
  activeVariant = computed(() => this.variants()[this.activeLength()]);

  streamingText = signal('');
  snippets = signal<TranscriptSnippet[]>([]);
  visualTimecodes = signal<VisualTimecode[]>([]);
  visualState = signal<'idle' | 'loading' | 'done' | 'error'>('idle');
  /** Whether the user enabled Visual Highlights for this session */
  visualHighlightsEnabled = signal(false);

  error = signal<{ message: string; isVideoIssue: boolean; isRateLimit: boolean } | null>(null);
  retryCountdown = signal(0);
  retryButtonCountdown = signal(0);

  private streamSub: Subscription | null = null;
  private byVideoSub: Subscription | null = null;
  private visualSub: Subscription | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private autoRetryUsed = false;
  private lastTier = 'quality';
  private lastLength: SummaryLength = 'medium';

  get canRetryWithNative(): boolean {
    const params = this.flow.summarizeParams();
    return !!(params?.nativeLang === undefined && params?.tracks.some(t => !t.isTranslated));
  }

  async init(videoId: string, lang: string, initialLength: SummaryLength, sourceLang?: string) {
    this.videoId.set(videoId);
    this.lang.set(lang);
    this.activeLength.set(initialLength);

    const params = this.flow.summarizeParams();
    // sourceLang from URL takes precedence; fall back to nativeLang from flow params
    const resolvedSourceLang = sourceLang && sourceLang !== lang ? sourceLang : params?.nativeLang;
    this.sourceLang.set(resolvedSourceLang);

    if (params) {
      this.videoUrl.set(params.url);
      this.videoTitle.set(params.videoTitle);
      this.visualHighlightsEnabled.set(params.visualHighlights);
    } else {
      this.videoUrl.set(`https://www.youtube.com/watch?v=${videoId}`);
    }

    try {
      const result = await firstValueFrom(this.api.getByVideo(videoId, lang, this.sourceLang()));
      if (result.videoTitle) this.videoTitle.set(result.videoTitle);
      if (result.videoUrl) this.videoUrl.set(result.videoUrl);
      if (result.metaTitle) this.metaTitle.set(result.metaTitle);
      if (result.metaDescription) this.metaDescription.set(result.metaDescription);
      if (result.previewImage) this.previewImage.set(result.previewImage);
      if (result.videoDuration != null) this.videoDuration.set(result.videoDuration);
      if (result.videoPublishedAt) this.videoPublishedAt.set(result.videoPublishedAt);
      if (result.createdAt) this.articleCreatedAt.set(result.createdAt);
      if (result.transcript?.length) this.snippets.set(result.transcript);

      this.variants.set({
        full: result.variants.full ?? null,
        medium: result.variants.medium ?? null,
        brief: result.variants.brief ?? null,
      });

      // If active length has no variant:
      // - from /articles: switch to first available (browse mode, just show something)
      // - from /select:   keep the requested length and generate it below
      if (!this.variants()[this.activeLength()]) {
        if (!params) {
          const first = (['full', 'medium', 'brief'] as SummaryLength[]).find(l => !!this.variants()[l]);
          if (first) this.activeLength.set(first);
        }
      }

      // Show screenshots from DB immediately (no extra request needed)
      if (result.screenshots?.length) {
        this.visualTimecodes.set(result.screenshots);
        this.visualState.set('done');
        this.visualHighlightsEnabled.set(true);
      }

      this.initPhase.set('done');

      // Auto-generate if coming from select and active variant is not yet generated
      if (params && !this.variants()[this.activeLength()]) {
        this.generate(params.tier);
      }
    } catch {
      this.initPhase.set('done');
      if (params) {
        this.generate(params.tier);
      }
    }
  }

  switchLength(length: SummaryLength) {
    this.activeLength.set(length);
    this.router.navigate([], { queryParams: { length }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  generate(tier: string) {
    const length = this.activeLength();
    this.lastTier = tier;
    this.lastLength = length;

    this.error.set(null);
    this.clearRetryTimer();
    this.autoRetryUsed = false;
    this.streamingText.set('');
    this.byVideoSub?.unsubscribe();
    this.byVideoSub = null;
    this.setVariant(length, 'loading');
    this.streamSub?.unsubscribe();

    this.streamSub = this.api.summarizeStream(
      this.videoUrl(),
      this.lang(),
      tier,
      length,
      this.videoTitle() || 'Untitled',
      this.sourceLang(),
    ).subscribe({
      next: (event) => {
        if (event.type === 'transcript') {
          this.snippets.set(event.snippets);
          this.videoId.set(event.videoId);
          if (this.visualHighlightsEnabled()) this.startVisualTimecodes();
        } else if (event.type === 'text') {
          this.streamingText.update(t => t + event.chunk);
        }
      },
      complete: () => {
        this.streamSub = null;
        this.byVideoSub = this.api.getByVideo(this.videoId(), this.lang(), this.sourceLang()).subscribe({
          next: (result) => {
            this.byVideoSub = null;
            const saved = result.variants[length];
            this.setVariant(length, saved ?? null);
            if (result.transcript?.length) this.snippets.set(result.transcript);
          },
          error: () => {
            this.byVideoSub = null;
            this.setVariant(length, null);
          },
        });
      },
      error: (err) => {
        this.streamSub = null;
        this.setVariant(length, null);
        const msg: string = err.message || 'Failed to generate summary';
        const isRateLimit = msg.toLowerCase().includes('rate-limit') || msg.toLowerCase().includes('rate limiting');
        if (this.visualHighlightsEnabled()) {
          this.visualSub?.unsubscribe();
          this.visualSub = null;
          this.visualTimecodes.set([]);
          this.visualState.set('idle');
        }
        this.error.set({
          message: msg,
          isVideoIssue: err instanceof ApiError && err.status === 422,
          isRateLimit,
        });
        if (isRateLimit) this.startRetryCountdown(30);
      },
    });
  }

  regenerate() {
    this.generate('quality');
  }

  retryNow() {
    this.autoRetryUsed = true;
    this.generate(this.lastTier);
  }

  retryWithNativeLang() {
    const params = this.flow.summarizeParams();
    if (!params) return;
    const nativeTrack = params.tracks.find(t => !t.isTranslated);
    this.flow.summarizeParams.set({ ...params, nativeLang: nativeTrack?.lang });
    this.autoRetryUsed = true;
    this.generate(this.lastTier);
  }

  newVideo() {
    this.clearRetryTimer();
    this.streamSub?.unsubscribe();
    this.streamSub = null;
    this.byVideoSub?.unsubscribe();
    this.byVideoSub = null;
    this.visualSub?.unsubscribe();
    this.visualSub = null;
    this.flow.reset();
    this.router.navigate(['/']);
  }

  variantToMarkdown(v: ArticleVariant): string {
    const h = getHeadings(this.lang());
    const parts = [`## ${v.title}`, v.intro];
    for (const s of v.sections) {
      parts.push(`### ${s.heading}`, s.content);
    }
    if (v.keyPoints.length) {
      parts.push(`### ${h.keyTakeaways}`);
      v.keyPoints.forEach(kp => parts.push(`- ${kp}`));
    }
    if (v.conclusion) parts.push(`### ${h.conclusion}`, v.conclusion);
    return parts.join('\n\n');
  }

  private setVariant(length: SummaryLength, value: VariantStatus) {
    this.variants.update(v => ({ ...v, [length]: value }));
  }

  generateVisualHighlights() {
    this.visualHighlightsEnabled.set(true);
    this.startVisualTimecodes();
  }

  private startVisualTimecodes() {
    if (this.visualState() === 'done') return; // already loaded for this video
    this.visualSub?.unsubscribe();
    this.visualTimecodes.set([]);
    this.visualState.set('loading');
    this.visualSub = this.api.getVisualTimecodes(this.videoUrl(), this.lang()).subscribe({
      next: (batch) => {
        this.visualTimecodes.update(existing => [...existing, ...batch]);
      },
      complete: () => this.visualState.set('done'),
      error: () => this.visualState.set('error'),
    });
  }

  private startRetryCountdown(seconds: number) {
    this.retryCountdown.set(seconds);
    this.retryButtonCountdown.set(this.autoRetryUsed ? seconds : 5);
    this.retryTimer = setInterval(() => {
      const next = this.retryCountdown() - 1;
      this.retryCountdown.set(Math.max(0, next));
      const btnNext = this.retryButtonCountdown() - 1;
      this.retryButtonCountdown.set(Math.max(0, btnNext));
      if (next <= 0) {
        this.clearRetryTimer();
        if (!this.autoRetryUsed) {
          this.autoRetryUsed = true;
          this.generate(this.lastTier);
        }
      }
    }, 1000);
  }

  private clearRetryTimer() {
    if (this.retryTimer !== null) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.retryCountdown.set(0);
    this.retryButtonCountdown.set(0);
  }

  ngOnDestroy() {
    this.clearRetryTimer();
    this.streamSub?.unsubscribe();
    this.byVideoSub?.unsubscribe();
    this.visualSub?.unsubscribe();
  }
}
