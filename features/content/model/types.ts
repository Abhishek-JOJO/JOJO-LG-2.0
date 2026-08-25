/**
 * Content Feature — Type Definitions
 *
 * Covers: Assets, Seasons, Episodes, Playback, TVOD Pricing
 * No `any` used.
 */

// ── Enums ─────────────────────────────────────────────────────────────────────

export type AssetCategory = 'SVOD' | 'TVOD' | 'FREE';
export type AssetType = 'MOVIE' | 'SHOW' | 'EPISODE' | 'TRAILER' | 'CLIP';

// Numeric asset type codes from the API (matches old AssetType enum)
export const ASSET_TYPE_CODE = {
  MOVIE: 1,
  SHOW: 2,
  TRAILER: 3,
  CLIP: 4,
  EPISODE: 5,
} as const;

export type AssetTypeCode = (typeof ASSET_TYPE_CODE)[keyof typeof ASSET_TYPE_CODE];

export const ASSET_CATEGORY_CODE = {
  AVOD: 1, // free with ads for logged in Users
  SVOD: 2,
  TVOD: 3,
  FVOD: 4, // Full access to guest users with ads for free.
  LVOD: 5, // Limited Access to guest user with 10 mins or so playback
} as const;

export type AssetCategoryCode = (typeof ASSET_CATEGORY_CODE)[keyof typeof ASSET_CATEGORY_CODE];

// ── Poster ────────────────────────────────────────────────────────────────────

export interface Poster {
  ratioId: number;
  url: string;
  isDefault: boolean;
}

export interface Professional {
  id: number;
  name: string;
  role: string;
  image: string | null;
}

// ── Episode ───────────────────────────────────────────────────────────────────

export interface Episode {
  assetId: string;
  title: string;
  description: string;
  /** Duration in seconds */
  durationSeconds: number;
  assetTypeCode: AssetTypeCode;
  /** The season's asset_id — used as parentId in playback/heartbeat */
  parentId: string;
  poster: Poster | null;
  /** Episode number within the season (1-based) */
  episodeNumber: number;
}

// ── Season ────────────────────────────────────────────────────────────────────

export interface Season {
  assetId: string;
  title: string;
  seasonNumber: number;
  totalPages: number;
  /** Page 1 episodes — pre-loaded from the asset API */
  episodes: Episode[];
}

// ── Content Asset (full detail) ───────────────────────────────────────────────

export interface ContentAsset {
  assetId: string;
  title: string;
  description: string;
  assetCategoryCode: AssetCategoryCode;
  assetCategory: AssetCategory;
  assetTypeCode: AssetTypeCode;
  assetType: AssetType;
  seasons: Season[];
  poster: Poster | null;
  landscape: Poster | null;
  titleImage: string | null;
  isInTop10: boolean;
  numberintop10?: number;
  releaseDate: string | null;
  certification: string | null;
  genres: string[];
  professionals: Professional[];
  directors: Professional[];
  writers: Professional[];
  classifications: string[];
  previewUrl: string | null;
  /** Total duration in seconds — for movies */
  durationSeconds: number;
  trailers: any[];
  /** API field: atrailers — array of trailer objects with trailer_url, trailer_thumbnail, etc. */
  atrailers?: Array<{
    trailer_id: number;
    trailer_url: string;
    trailer_thumbnail: string;
    trailer_title: string;
    trailer_genre: any[];
    name_analytics: string;
  }>;
  asset_tags?: string[];
  asset_tags_badgeText?: string;
  seoTitle: string | null;
  seoDescription: string | null;
  nameAnalytics: string | null;
  isTVOD?: boolean;
  isSVOD?: boolean;
  /** True when the asset is a scheduled upcoming release (is_upcoming_scheduled: true) */
  isUpcomingScheduled?: boolean;
  /** Teaser/upcoming preview URL — used instead of previewUrl for upcoming assets */
  upcomingUrl?: string | null;
}

// ── Paginated episode response ────────────────────────────────────────────────

export interface EpisodePageResult {
  episodes: Episode[];
  currentPage: number;
  totalPages: number;
}

// ── Playback ──────────────────────────────────────────────────────────────────

export interface PlaybackData {
  playbackUrl: string;
  vttUrl: string | null;
  /** Socket heartbeat session ID */
  playerId: string;
  totalDuration: number;
  adTagUrl: string | null;
  adRepeat: boolean;
  adRepeatDurationMinutes: number;
}

export interface PlaybackRequest {
  assetId: string;
  /** Whether the user has an active subscription */
  isSubscribe: boolean;
}

// ── TVOD Pricing ──────────────────────────────────────────────────────────────

export interface AssetPricing {
  isUserPurchased: boolean;
  daysLeft: string;
  price: number;
  currencySymbol: string;
  currency: string;
  productId: string;
  skuId: string;
  /** Rental validity in days (e.g. 2 days to watch) */
  rentalValidityDays: number;
  /** Purchase validity in days (e.g. 30 days to start watching) */
  initialValidityDays: number;
  rawProducts?: any[];
  oProductTranslation?: any;
  aFeatures?: any[];
  sName?: string;
}

// ── Gating ────────────────────────────────────────────────────────────────────

export type GatingReason = 'none' | 'auth' | 'subscription' | 'tvod';

export interface GatingResult {
  gate: GatingReason;
}

// ── API raw shapes (before mapping) ──────────────────────────────────────────

export interface EpisodeApiShape {
  asset_id: string;
  asset_title: string;
  asset_description: string;
  asset_total_duration: number;
  asset_type: number;
  parent_id: string;
  poster: Array<{ ratio_id: number; url: string; is_default?: boolean }>;
}

export interface SeasonApiShape {
  asset_id: string;
  asset_title: string;
  total_pages: number;
  episodes: EpisodeApiShape[];
}

export interface ContentAssetApiShape {
  asset_id: string;
  asset_title: string;
  asset_description: string;
  asset_category: number;
  asset_type: number;
  seasons: SeasonApiShape[];
  poster: Array<{ ratio_id: number; url: string; is_default?: boolean }>;
  landscape?: Array<{ ratio_id: number; url: string; is_default?: boolean }>;
  title_image?: string;
  isintop10?: boolean;
  numberintop10?: number;
  asset_release_date?: string;
  asset_certification?: string;
  asset_genre?: string[];
  asset_classifications?: string[];
  preview_url?: string;
  asset_professionals?: Array<{
    professional_id: number;
    portrays_as: string;
    orderby?: number;
    professional_image: string;
    first_name: string;
    last_name: string;
    name_analytics: string;
  }>;
  director?: Array<{
    professional_id: number;
    professional_image: string;
    first_name: string;
    last_name: string;
    name_analytics: string;
  }>;
  writer?: Array<{
    professional_id: number;
    professional_image: string;
    first_name: string;
    last_name: string;
    name_analytics: string;
  }>;
  asset_total_duration: number;
  asset_tags?: string[];
  seo_title?: string;
  seo_description?: string;
  name_analytics?: string;
}

export interface PlaybackApiShape {
  playback_url: string;
  vtt_url: string | null;
  player_id: string;
  total_duration: number;
  ads: {
    ad_repeat: boolean;
    ad_repeat_duration: number;
    ad_tag_url: string | null;
    mid_roll_points?: number[];
  } | null;
  skip_intro?: {
    visible_at?: string;
    visible_end?: string;
    duration?: string;
  } | null;
  skip_recap?: {
    visible_at?: string;
    visible_end?: string;
    duration?: string;
  } | null;
  next_title?: {
    visible_at?: string;
    visible_end?: string;
    start_at?: string;
  } | null;
}

export interface AssetPricingApiShape {
  bIsUserPurchased: boolean;
  sDaysLeft: string;
  aOneTimeProducts: Array<{
    sProductId: string;
    aProviderSkus: Array<{
      sUniqueSkuId: string;
      oPricing: {
        nPrice: number;
        sCurrencySymbol: string;
        sCurrency: string;
      };
    }>;
    nRentalValidityDays: number;
    nInitialValidityDays: number;
  }>;
}
