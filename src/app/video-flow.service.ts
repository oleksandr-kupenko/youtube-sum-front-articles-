import { Injectable, signal } from '@angular/core';
import { AnalyzeResponse, SubtitleTrack } from './services/video-api.service';

export interface SummarizeParams {
  url: string;
  lang: string;
  tier: string;
  length: string;
  videoTitle: string;
  nativeLang?: string;
  visualHighlights: boolean;
  tracks: SubtitleTrack[];
}

@Injectable({ providedIn: 'root' })
export class VideoFlowService {
  videoUrl = signal<string>('');
  analyzeResult = signal<AnalyzeResponse | null>(null);
  summarizeParams = signal<SummarizeParams | null>(null);

  reset() {
    this.videoUrl.set('');
    this.analyzeResult.set(null);
    this.summarizeParams.set(null);
  }
}
