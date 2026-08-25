export enum ContentRailType {
  HERO_CAROUSEL = "HERO_CAROUSEL",
  TOP_10 = "TOP_10",
  LANDSCAPE = "LANDSCAPE",
  CONTINUE_WATCHING = "CONTINUE_WATCHING",
  PORTRAIT = "PORTRAIT",
  UPCOMING_ON_JOJO = "UPCOMING_ON_JOJO",
  ARTIST = "ARTIST",
  SERIES_MIXED = "SERIES_MIXED",
  GENRE = "GENRE",
  JOJO_GOLD = "JOJO_GOLD",
  RED_CARPET = "RED_CARPET",
}

export enum RailCardVariant {
  HERO = "hero",
  PORTRAIT = "portrait",
  LANDSCAPE = "landscape",
  CONTINUE_WATCHING = "continueWatching",
  TOP_TEN = "topTen",
  ARTIST = "artist",
  GENRE = "genre",
  UPCOMING = "upcoming",
  SERIES_MIXED = "seriesMixed",
}

export interface ContentRailItem {
  id: string;
  assetId?: string;
  title: string;
  subtitle?: string;
  description?: string;

  image: string;
  hoverImage?: string;

  landscapeImage?: string;
  portraitImage?: string;
  posterImage?: string;
  thumbnailImage?: string;
  heroImage?: string;
  title_image?: string;

  duration?: string;
  year?: string;
  ageRating?: string;
  certification?: string;
  genres?: string[];

  asset_tags_badgeText?: string;
  progressPercentage?: number;
  progressSeconds?: number;
  rank?: number;

  redirectUrl?: string;
  previewUrl?: string;
  isTop10?: boolean;
  numberintop10?: number;

  // Asset classifications
  classifications?: string[];
  assetCategory?: string;
  tags?: string[];
  isSVOD?: boolean;
  isTVOD?: boolean;
  isAVOD?: boolean;
  isFVOD?: boolean;
  isLVOD?: boolean;
  isPremium?: boolean;
  assetType?: string;
  assetTypeCode?: number;
  name_analytics?: string;
}

export interface ContentRailData {
  id: string;
  title: string;
  type: ContentRailType;
  items: ContentRailItem[];
  totalPages?: number;
  currentPage?: number;
  limit?: number;
  button_name?: string;
  more_enabled?: boolean;
}

export enum ApiDisplayType {
  UPCOMING = 1,
  ARTIST = 2,
  SERIES = 3,
  GENRE = 4,
  TOP_10 = 5,
  PORTRAIT = 6,
  LANDSCAPE = 7,
  MAIN_CAROUSEL = 8,
  CONTINUE_WATCHING = 9,
  AUTO_LANDSCAPE = 10,
  RED_CARPET = 11,
  CAROUSEL_AD = 12,
  POSTER_AD_390X450 = 13,
  MAIN_CAROUSEL_14 = 14,
  CR_15 = 15,
  CR_16 = 16,
  CR_17 = 17,
}

export enum ApiImageRatio {
  LANDSCAPE = 1,
  PORTRAIT = 2,
  POSTER_3 = 3,
  PORTRAIT_4 = 4,
  POSTER_7 = 7,
}

export enum ApiAssetCategory {
  AVOD = 1,
  SVOD = 2,
  TVOD = 3,
  FVOD = 4,
  LVOD = 5,
}

export const displayTypeMap: Record<ApiDisplayType, ContentRailType> = {
  [ApiDisplayType.UPCOMING]: ContentRailType.UPCOMING_ON_JOJO,
  [ApiDisplayType.ARTIST]: ContentRailType.ARTIST,
  [ApiDisplayType.SERIES]: ContentRailType.SERIES_MIXED,
  [ApiDisplayType.GENRE]: ContentRailType.GENRE,
  [ApiDisplayType.TOP_10]: ContentRailType.TOP_10,
  [ApiDisplayType.PORTRAIT]: ContentRailType.PORTRAIT,
  [ApiDisplayType.LANDSCAPE]: ContentRailType.PORTRAIT,
  [ApiDisplayType.MAIN_CAROUSEL]: ContentRailType.HERO_CAROUSEL,
  [ApiDisplayType.CONTINUE_WATCHING]: ContentRailType.CONTINUE_WATCHING,
  [ApiDisplayType.AUTO_LANDSCAPE]: ContentRailType.PORTRAIT,
  [ApiDisplayType.RED_CARPET]: ContentRailType.RED_CARPET,
  [ApiDisplayType.CAROUSEL_AD]: ContentRailType.PORTRAIT,
  [ApiDisplayType.POSTER_AD_390X450]: ContentRailType.PORTRAIT,
  [ApiDisplayType.MAIN_CAROUSEL_14]: ContentRailType.HERO_CAROUSEL,
  [ApiDisplayType.CR_15]: ContentRailType.PORTRAIT,
  [ApiDisplayType.CR_16]: ContentRailType.PORTRAIT,
  [ApiDisplayType.CR_17]: ContentRailType.PORTRAIT,
};

export const rawToEnumMap: Record<string | number, ApiDisplayType> = {
  1: ApiDisplayType.UPCOMING,
  2: ApiDisplayType.ARTIST,
  3: ApiDisplayType.SERIES,
  4: ApiDisplayType.GENRE,
  5: ApiDisplayType.TOP_10,
  6: ApiDisplayType.PORTRAIT,
  7: ApiDisplayType.LANDSCAPE,
  8: ApiDisplayType.MAIN_CAROUSEL,
  9: ApiDisplayType.CONTINUE_WATCHING,
  10: ApiDisplayType.AUTO_LANDSCAPE,
  11: ApiDisplayType.RED_CARPET,
  12: ApiDisplayType.CAROUSEL_AD,
  13: ApiDisplayType.POSTER_AD_390X450,
  14: ApiDisplayType.MAIN_CAROUSEL_14,
  15: ApiDisplayType.CR_15,
  16: ApiDisplayType.CR_16,
  17: ApiDisplayType.CR_17,
};