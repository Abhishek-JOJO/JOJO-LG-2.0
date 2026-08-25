/**
 * Content Feature — API Response Mappers
 * Follows exact pattern of features/profile/model/mapper.ts
 */

import type { ApiResponse } from '@lib/types/api.types';
import type {
  ContentAsset,
  Season,
  Episode,
  Poster,
  Professional,
  EpisodePageResult,
  PlaybackData,
  AssetPricing,
  ContentAssetApiShape,
  SeasonApiShape,
  EpisodeApiShape,
  PlaybackApiShape,
  AssetPricingApiShape,
  AssetCategory,
  AssetType,
  AssetCategoryCode,
  AssetTypeCode,
} from './types';
import { ASSET_TYPE_CODE, ASSET_CATEGORY_CODE } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapAssetCategory(code: number): AssetCategory {
  switch (code) {
    case ASSET_CATEGORY_CODE.SVOD: return 'SVOD';
    case ASSET_CATEGORY_CODE.TVOD: return 'TVOD';
    default: return 'FREE';
  }
}

function mapAssetType(code: number): AssetType {
  switch (code) {
    case 1:
    case 6:
      return 'MOVIE';
    case 2:
    case 3:
      return 'SHOW';
    case 5:
      return 'EPISODE';
    default:
      return 'MOVIE';
  }
}

function mapPoster(posters: any): Poster | null {
  if (!posters) return null;
  if (typeof posters === "string" && posters.trim()) {
    return { ratioId: 0, url: posters.trim(), isDefault: true };
  }
  if (Array.isArray(posters) && posters.length > 0) {
    const defaultPoster = posters.find((p: any) => p?.is_default) ?? posters[0];
    const url = typeof defaultPoster === "string" ? defaultPoster : defaultPoster?.url || defaultPoster?.path || defaultPoster?.src || "";
    if (url) {
      return {
        ratioId: defaultPoster?.ratio_id || 0,
        url,
        isDefault: defaultPoster?.is_default ?? false,
      };
    }
  }
  if (typeof posters === "object" && (posters.url || posters.path || posters.src)) {
    const url = posters.url || posters.path || posters.src;
    if (url) {
      return {
        ratioId: posters.ratio_id || 0,
        url,
        isDefault: posters.is_default ?? true,
      };
    }
  }
  return null;
}

function mapEpisode(api: EpisodeApiShape, index: number): Episode {
  const epNum = (api as any).episode_number ? parseInt((api as any).episode_number, 10) : index + 1;
  const duration = api.asset_total_duration ? parseFloat(api.asset_total_duration as any) : 0;
  return {
    assetId: api.asset_id,
    title: api.asset_title,
    description: api.asset_description ?? '',
    durationSeconds: isNaN(duration) ? 0 : duration,
    assetTypeCode: api.asset_type as AssetTypeCode,
    parentId: api.parent_id,
    poster: mapPoster(api.poster ?? []),
    episodeNumber: isNaN(epNum) ? index + 1 : epNum,
  };
}

function mapSeason(api: SeasonApiShape, index: number): Season {
  return {
    assetId: api.asset_id,
    title: api.asset_title,
    seasonNumber: index + 1,
    totalPages: api.total_pages ?? 1,
    episodes: Array.isArray(api.episodes)
      ? api.episodes.map((ep, epIdx) => mapEpisode(ep, epIdx))
      : [],
  };
}

function mapProfessional(api: any, role: string): Professional {
  return {
    id: Number(api.professional_id),
    name: `${api.first_name || ""} ${api.last_name || ""}`.trim() || api.name_analytics,
    role: api.portrays_as || role,
    image: api.professional_image || null,
  };
}

// ── Public mappers ────────────────────────────────────────────────────────────

export function mapContentAsset(
  apiResponse: ApiResponse<ContentAssetApiShape>
): ContentAsset {
  const data = apiResponse.data;
  if (!data) throw new Error('Content asset API returned null data');

  const mainDuration = data.asset_total_duration ? parseFloat(data.asset_total_duration as any) : 0;

  return {
    assetId: data.asset_id,
    title: data.asset_title,
    description: data.asset_description ?? '',
    assetCategoryCode: data.asset_category as AssetCategoryCode,
    assetCategory: mapAssetCategory(data.asset_category),
    assetTypeCode: data.asset_type as AssetTypeCode,
    assetType: mapAssetType(data.asset_type),
    seasons: Array.isArray(data.seasons)
      ? data.seasons.map((s, idx) => mapSeason(s, idx))
      : [],
    poster: mapPoster(data.poster ?? (data as any).asset_poster ?? (data as any).posters),
    landscape: mapPoster(data.landscape ?? (data as any).asset_landscape ?? (data as any).landscapes ?? (data as any).banner ?? (data as any).thumbnail),
    titleImage: data.title_image ?? null,
    isInTop10: data.isintop10 ?? false,
    numberintop10: data.numberintop10,
    releaseDate: data.asset_release_date ?? null,
    certification: data.asset_certification ?? null,
    genres: Array.isArray(data.asset_genre) ? data.asset_genre : [],
    professionals: Array.isArray(data.asset_professionals)
      ? data.asset_professionals.map((p) => mapProfessional(p, "Actor"))
      : [],
    directors: Array.isArray(data.director)
      ? data.director.map((d) => mapProfessional(d, "Director"))
      : [],
    writers: Array.isArray(data.writer)
      ? data.writer.map((w) => mapProfessional(w, "Writer"))
      : [],
    classifications: Array.isArray(data.asset_classifications) ? data.asset_classifications : [],
    previewUrl: data.preview_url ?? null,
    durationSeconds: isNaN(mainDuration) ? 0 : mainDuration,
    trailers: Array.isArray((data as any).trailers) ? (data as any).trailers : [],
    atrailers: Array.isArray((data as any).atrailers) ? (data as any).atrailers : undefined,
    asset_tags: Array.isArray(data.asset_tags) ? data.asset_tags : [],
    asset_tags_badgeText: Array.isArray(data.asset_tags) && data.asset_tags.length > 0 ? data.asset_tags[0] : undefined,
    seoTitle: data.seo_title ?? null,
    seoDescription: data.seo_description ?? null,
    nameAnalytics: data.name_analytics ?? null,
    isUpcomingScheduled: (data as any).is_upcoming_scheduled === true,
    upcomingUrl: (data as any).upcoming_url ?? (data as any).upcomingUrl ?? null,
  };
}

export function mapEpisodePage(
  apiResponse: ApiResponse<{ episodes: EpisodeApiShape[] }>,
  currentPage: number,
  totalPages: number
): EpisodePageResult {
  const data = apiResponse.data;
  const rawEpisodes = data?.episodes ?? [];

  return {
    episodes: rawEpisodes.map((ep, idx) => mapEpisode(ep, idx)),
    currentPage,
    totalPages,
  };
}

export function mapPlaybackData(
  apiResponse: ApiResponse<PlaybackApiShape>
): PlaybackData {
  const data = apiResponse.data;
  if (!data) throw new Error('Playback API returned null data');

  return {
    playbackUrl: data.playback_url,
    vttUrl: data.vtt_url ?? null,
    playerId: data.player_id,
    totalDuration: data.total_duration ?? 0,
    adTagUrl: data.ads?.ad_tag_url ?? null,
    adRepeat: data.ads?.ad_repeat ?? false,
    adRepeatDurationMinutes: data.ads?.ad_repeat_duration ?? 0,
  };
}

export function mapAssetPricing(
  apiResponse: ApiResponse<AssetPricingApiShape>
): AssetPricing {
  const data = apiResponse.data;
  if (!data) throw new Error('Asset pricing API returned null data');

  const product = data.aOneTimeProducts?.[0] as any;
  const sku = product?.aProviderSkus?.[0];
  const pricing = sku?.oPricing;

  return {
    isUserPurchased: data.bIsUserPurchased ?? false,
    daysLeft: data.sDaysLeft ?? '',
    price: pricing?.nPrice ?? 0,
    currencySymbol: pricing?.sCurrencySymbol ?? '₹',
    currency: pricing?.sCurrency ?? 'INR',
    productId: product?.sProductId ?? '',
    skuId: sku?.sUniqueSkuId ?? '',
    rentalValidityDays: product?.nRentalValidityDays ?? 2,
    initialValidityDays: product?.nInitialValidityDays ?? 30,
    rawProducts: data.aOneTimeProducts,
    oProductTranslation: product?.oProductTranslation,
    aFeatures: product?.aFeatures,
    sName: product?.oProductTranslation?.sName || product?.sOneTimeProductLabel || '',
  };
}
