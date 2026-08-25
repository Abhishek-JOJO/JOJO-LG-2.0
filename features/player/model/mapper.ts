/**
 * Player Feature — API Response Mappers
 *
 * Transforms raw API responses into domain models.
 * Follows the exact same pattern as features/profile/model/mapper.ts
 */

import type { PlaybackApiShape } from '@/features/content/model/types';
import type {
  VideoDetails,
  SeriesInfo,
  StreamFormat,
} from './types';
import { mapPlaybackMarkers } from '../utils/playbackMarkers';

function mapStreamFormat(raw: string): StreamFormat {
  const lower = raw.toLowerCase();
  if (lower === 'hls' || lower === 'm3u8' || lower.includes('.m3u8') || lower.includes('m3u8')) return 'hls';
  if (lower === 'dash' || lower === 'mpd' || lower.includes('.mpd') || lower.includes('mpd')) return 'dash';
  return 'mp4';
}

export function mapVideoDetails(
  playbackData: PlaybackApiShape,
  metadata: {
    title: string;
    description: string;
    seriesInfo: SeriesInfo | null;
    certification?: string | null;
    classifications?: string[] | null;
    assetCategory?: string | null;
    assetCertificate?: string | null;
    inTop10?: boolean;
    seasonId?: string | number | null;
    numberInTop10?: number | null;
    assetTypeName?: string | null;
  },
  savedPosition: number | null = null,
  contentId: string = '',
  vmapXml: string | null = null,
  bypassResumePrompt: boolean = false
): VideoDetails {
  const markers = mapPlaybackMarkers(playbackData);

  return {
    contentId: contentId,
    title: metadata.title,
    description: metadata.description,
    manifestUrl: playbackData.playback_url,
    streamFormat: mapStreamFormat(playbackData.playback_url),
    durationSeconds: playbackData.total_duration ?? 0,
    thumbnailUrl: '',
    thumbnailVttUrl: playbackData.vtt_url ?? null,
    thumbnailSpriteUrl: null,
    adTagUrl: playbackData.ads?.ad_tag_url ?? null,
    adCuePoints: playbackData.ads?.mid_roll_points ?? [],
    vmapUrl: null,
    vmapXml: vmapXml,
    contentType: metadata.seriesInfo ? 'episode' : 'movie',
    seriesInfo: metadata.seriesInfo,
    savedPosition,
    bypassResumePrompt,
    drmConfig: null,
    liveConfig: null,
    playerId: playbackData.player_id ?? null,
    parentId: metadata.seriesInfo?.seriesId ?? null,
    assetType: null,
    skipIntro: markers.skipIntro ?? null,
    skipRecap: markers.skipRecap ?? null,
    nextTitle: markers.nextTitle ?? null,
    certification: metadata.certification ?? metadata.assetCertificate ?? null,
    classifications: metadata.classifications ?? null,
    assetCategory: metadata.assetCategory || 'avod',
    assetCertificate: metadata.assetCertificate || metadata.certification || null,
    inTop10: metadata.inTop10 ?? false,
    seasonId: metadata.seasonId ?? metadata.seriesInfo?.seriesId ?? null,
    numberInTop10: metadata.numberInTop10 ?? null,
    assetTypeName: metadata.assetTypeName || (metadata.seriesInfo ? 'episode' : 'movie'),
  };
}
