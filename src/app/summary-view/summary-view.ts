import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranscriptSnippet, VisualTimecode, VideoApiService } from '../services/video-api.service';
import { TooltipDirective } from '../share/directives/tooltip.directive';
import { MAX_VISUAL_DURATION_SECONDS } from '../visual-highlights';

const GROUP_SECONDS = 45;

interface TranscriptGroup {
  startSeconds: number;
  label: string;
  text: string;
}

@Component({
  selector: 'app-summary-view',
  templateUrl: './summary-view.html',
  imports: [TooltipDirective],
})
export class SummaryViewComponent {
  private sanitizer = inject(DomSanitizer);
  private document = inject(DOCUMENT);
  api = inject(VideoApiService);

  text = input.required<string>();
  snippets = input<TranscriptSnippet[]>([]);
  videoId = input<string>('');
  videoUrl = input<string>('');
  visualHighlights = input<boolean>(false);
  visualTimecodes = input<VisualTimecode[]>([]);
  visualState = input<'idle' | 'loading' | 'done' | 'error'>('idle');
  isStreaming = input<boolean>(false);
  showSubtitles = input<boolean>(false);
  videoDuration = input<number | null>(null);
  videoPublishedAt = input<string | null>(null);
  articleCreatedAt = input<string | null>(null);
  previewImage = input<string | null>(null);
  articleLang = input<string>('');
  sourceLang = input<string | undefined>(undefined);
  reset = output<void>();
  generateHighlights = output<void>();

  copied = signal<'article' | 'subtitles' | 'link' | null>(null);

  visualHighlightsDisabled = computed(() => {
    const dur = this.videoDuration();
    return dur != null && dur > MAX_VISUAL_DURATION_SECONDS;
  });

  shareUrl = computed(() => this.document.defaultView?.location.href ?? '');

  shareLinks = computed(() => {
    const url = encodeURIComponent(this.shareUrl());
    const text = encodeURIComponent(this.title());
    const combined = encodeURIComponent(`${this.title()} ${this.shareUrl()}`);
    return {
      twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      whatsapp: `https://wa.me/?text=${combined}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };
  });
  loadedImages = signal<Set<number>>(new Set());
  failedImages = signal<Set<number>>(new Set());

  previewLoaded = signal(false);
  previewFailed = signal(false);
  previewUseFallback = signal(false);

  previewSrc = computed(() => {
    const dbImage = this.previewImage();
    if (dbImage) return `${this.api.resolveBaseUrl()}${dbImage}`;
    const id = this.videoId();
    if (!id) return '';
    return this.previewUseFallback()
      ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
      : `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
  });

  onPreviewLoad() {
    this.previewLoaded.set(true);
  }

  onPreviewError() {
    if (!this.previewUseFallback()) {
      this.previewUseFallback.set(true);
    } else {
      this.previewFailed.set(true);
    }
  }

  onImageLoad(seconds: number) {
    this.loadedImages.update(set => { const s = new Set(set); s.add(seconds); return s; });
  }

  onImageError(seconds: number) {
    this.failedImages.update(set => { const s = new Set(set); s.add(seconds); return s; });
  }

  isImageLoaded(seconds: number): boolean {
    return this.loadedImages().has(seconds);
  }

  isImageFailed(seconds: number): boolean {
    return this.failedImages().has(seconds);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
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

  getYouTubeLink(seconds: number): string {
    const vid = this.videoId();
    if (!vid) return '#';
    return `https://www.youtube.com/watch?v=${vid}&t=${Math.floor(seconds)}`;
  }

  async copyLink() {
    await navigator.clipboard.writeText(this.shareUrl());
    this.copied.set('link');
    setTimeout(() => this.copied.set(null), 2000);
  }

  async copyArticle() {
    await navigator.clipboard.writeText(this.text());
    this.copied.set('article');
    setTimeout(() => this.copied.set(null), 2000);
  }

  async copySubtitles() {
    const text = this.transcriptGroups()
      .map(g => `[${g.label}] ${g.text}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    this.copied.set('subtitles');
    setTimeout(() => this.copied.set(null), 2000);
  }

  downloadSubtitles() {
    const text = this.transcriptGroups()
      .map(g => `[${g.label}] ${g.text}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.title() || this.videoId() || 'subtitles'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Extract the title from the first ## heading, fallback to empty string */
  title = computed(() => {
    const match = this.text().match(/^##\s+(.+)/m);
    return match ? match[1].trim() : '';
  });

  /** Convert markdown to minimal HTML for display */
  articleHtml = computed<SafeHtml>(() => {
    const lines = this.text().split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeLines: string[] = [];
    let codeLang = '';

    const flushCodeBlock = () => {
      const langLabel = codeLang
        ? `<span class="absolute top-2 right-3 text-xs text-gray-500 font-mono select-none">${escape(codeLang)}</span>`
        : '';
      html += `<div class="relative my-4 rounded-lg overflow-hidden border border-gray-700/60">`
            + langLabel
            + `<pre class="bg-gray-950 text-gray-200 text-sm font-mono p-4 overflow-x-auto leading-relaxed">`
            + `<code>${codeLines.map(escape).join('\n')}</code>`
            + `</pre></div>`;
      codeLines = [];
      codeLang = '';
    };

    for (const line of lines) {
      if (!inCodeBlock && line.startsWith('```')) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      } else if (inCodeBlock && line.startsWith('```')) {
        inCodeBlock = false;
        flushCodeBlock();
      } else if (inCodeBlock) {
        codeLines.push(line);
      } else if (line.startsWith('## ')) {
        // Skip the title line — it's shown in the header
      } else if (line.startsWith('### ')) {
        html += `<h3 class="text-lg font-semibold mt-6 mb-2 text-white">${renderInline(line.slice(4))}</h3>`;
      } else if (line.startsWith('- ')) {
        html += `<li class="flex gap-2 text-gray-300 mb-1"><span class="text-red-500 shrink-0">•</span><span>${renderInline(line.slice(2))}</span></li>`;
      } else if (line.trim() === '') {
        html += '<div class="mb-3"></div>';
      } else {
        html += `<p class="text-gray-300 leading-relaxed mb-2">${renderInline(line)}</p>`;
      }
    }
    // Unclosed code block — render anyway
    if (inCodeBlock && codeLines.length) flushCodeBlock();

    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  /** Group snippets into ~45-second blocks for readable display */
  transcriptGroups = computed<TranscriptGroup[]>(() => {
    const snips = this.snippets();
    if (!snips.length) return [];

    const groups: TranscriptGroup[] = [];
    let currentStart = -1;
    let currentTexts: string[] = [];

    for (const s of snips) {
      const groupStart = Math.floor(s.start / GROUP_SECONDS) * GROUP_SECONDS;
      if (groupStart !== currentStart) {
        if (currentStart >= 0 && currentTexts.length) {
          groups.push({
            startSeconds: currentStart,
            label: formatTime(currentStart),
            text: currentTexts.join(' ').trim(),
          });
        }
        currentStart = groupStart;
        currentTexts = [];
      }
      currentTexts.push(s.text.trim());
    }
    if (currentStart >= 0 && currentTexts.length) {
      groups.push({
        startSeconds: currentStart,
        label: formatTime(currentStart),
        text: currentTexts.join(' ').trim(),
      });
    }
    return groups;
  });

  openAtTime(startSeconds: number) {
    const vid = this.videoId();
    if (!vid) return;
    window.open(
      `https://www.youtube.com/watch?v=${vid}&t=${Math.floor(startSeconds)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape plain text and render inline `code` spans */
function renderInline(raw: string): string {
  let result = '';
  let last = 0;
  const re = /`([^`]+)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    result += escape(raw.slice(last, m.index));
    result += `<code class="bg-gray-800 text-emerald-400 px-1.5 py-0.5 rounded text-[0.85em] font-mono">${escape(m[1])}</code>`;
    last = m.index + m[0].length;
  }
  result += escape(raw.slice(last));
  return result;
}
