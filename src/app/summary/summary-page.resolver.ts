import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { environment } from '../../environments/environment';

export interface SummaryPageData {
  videoId: string;
  lang: string;
  sourceLang?: string;
  pageTitle: string;
  metaDescription: string | null;
  previewImage: string | null;
  videoTitle: string;
  videoDuration: number | null;
  videoPublishedAt: string | null;
}

export const summaryPageResolver: ResolveFn<SummaryPageData | null> = async (route: ActivatedRouteSnapshot) => {
  const videoId = route.queryParams['v'] as string;
  const lang = route.queryParams['lang'] as string;
  const sourceLang = route.queryParams['sourceLang'] as string | undefined;

  if (!videoId || !lang) return null;

  try {
    const url = `${environment.apiUrl}/api/articles/by-video?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(lang)}${sourceLang ? `&sourceLang=${encodeURIComponent(sourceLang)}` : ''}`;
    const result = await fetch(url);
    if (!result.ok) return null;

    const data = await result.json();

    return {
      videoId,
      lang,
      sourceLang,
      pageTitle: data.metaTitle ?? data.videoTitle ?? 'YouTube Summary',
      metaDescription: data.metaDescription ?? null,
      previewImage: data.previewImage ?? null,
      videoTitle: data.videoTitle ?? '',
      videoDuration: data.videoDuration ?? null,
      videoPublishedAt: data.videoPublishedAt ?? null,
    };
  } catch {
    return null;
  }
};
