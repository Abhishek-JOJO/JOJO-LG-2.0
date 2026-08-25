import { ContentRailType, RailCardVariant } from "./contentRail.types";

// ─── Dimension Enums ─────────────────────────────────────────────────────────

export enum RailCardWidth {
  W_1200 = 1200,
  W_580 = 580,
  W_480 = 480,
  W_380 = 380,
  W_270 = 270,
  W_250 = 250,
  W_356 = 356,
  W_240 = 240,
  W_220 = 220,
  W_200 = 200,
  W_180 = 180,
  W_147 = 147,
  W_173 = 173,
  W_391 = 391,
  W_462 = 462
}

export enum RailCardHeight {
  H_900 = 900,
  H_360 = 360,
  H_350 = 350,
  H_330 = 330,
  H_326 = 326,
  H_300 = 300,
  H_270 = 270,
  H_260 = 260,
  H_250 = 250,
  H_200 = 200,
  H_150 = 150,
  H_98 = 98,
  H_220 = 220
}

export enum RailCardAspectRatio {
  WIDESCREEN_16_9 = "16:9",
  PORTRAIT_2_3 = "2:3",
  GENRE_20_9 = "20:9",
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface RailHoverConfig {
  enabled: boolean;
  type?: "simple" | "card";
  scale?: number;
  width?: RailCardWidth;
  height?: RailCardHeight;
  showOverlay?: boolean;
  showTitle?: boolean;
  showMeta?: boolean;
  showPlayButton?: boolean;
  showInfo?: boolean;
}

export interface RailCardDesignConfig {
  variant: RailCardVariant;

  width: RailCardWidth;
  height: RailCardHeight;
  aspectRatio: RailCardAspectRatio;
  borderRadius: number;
  gap: number;

  showTitle: boolean;
  showSubtitle?: boolean;
  showMeta?: boolean;
  showProgress?: boolean;
  showRank?: boolean;
  showBadge?: boolean;

  hover: RailHoverConfig;
}

// ─── Design Config Map ────────────────────────────────────────────────────────

export const CONTENT_RAIL_DESIGN_CONFIG: Record<ContentRailType, RailCardDesignConfig> = {
  [ContentRailType.HERO_CAROUSEL]: {
    variant: RailCardVariant.HERO,
    width: RailCardWidth.W_1200,
    height: RailCardHeight.H_900,
    aspectRatio: RailCardAspectRatio.WIDESCREEN_16_9,
    borderRadius: 0,
    gap: 16,
    showTitle: true,
    showMeta: true,
    hover: {
      enabled: false,
    },
  },

  [ContentRailType.TOP_10]: {
    variant: RailCardVariant.TOP_TEN,
    width: RailCardWidth.W_180,
    height: RailCardHeight.H_270,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    borderRadius: 8,
    gap: 10,
    showTitle: false,
    showRank: true,
    hover: {
      enabled: true,
      type: "card",
      scale: 1.08,
      showOverlay: false,
      showTitle: false,
      showPlayButton: false,
    },
  },

  [ContentRailType.LANDSCAPE]: {
    variant: RailCardVariant.LANDSCAPE,
    width: RailCardWidth.W_356,
    height: RailCardHeight.H_200,
    aspectRatio: RailCardAspectRatio.WIDESCREEN_16_9,
    borderRadius: 8,
    gap: 16,
    showTitle: false,
    showBadge: true,
    hover: {
      enabled: true,
      type: "card",
      scale: 1.08,
      showOverlay: false,
      showTitle: false,
      showMeta: false,
      showPlayButton: false,
    },
  },

  [ContentRailType.CONTINUE_WATCHING]: {
    variant: RailCardVariant.CONTINUE_WATCHING,
    width: RailCardWidth.W_356,
    height: RailCardHeight.H_200,
    aspectRatio: RailCardAspectRatio.WIDESCREEN_16_9,
    borderRadius: 8,
    gap: 16,
    showTitle: false,
    showProgress: true,
    hover: {
      enabled: false,
      scale: 1.0,
      showOverlay: false,
      showTitle: false,
      showPlayButton: false,
    },
  },

  [ContentRailType.PORTRAIT]: {
    variant: RailCardVariant.PORTRAIT,
    width: RailCardWidth.W_173,
    height: RailCardHeight.H_260,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    borderRadius: 8,
    gap: 16,
    showTitle: false,
    showBadge: true,
    hover: {
      enabled: true,
      type: "card",
      scale: 1.08,
      showOverlay: false,
      showTitle: false,
      showMeta: false,
      showPlayButton: false,
    },
  },

  [ContentRailType.UPCOMING_ON_JOJO]: {
    variant: RailCardVariant.UPCOMING,
    width: RailCardWidth.W_180,
    height: RailCardHeight.H_270,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    borderRadius: 8,
    gap: 16,
    showTitle: false,
    hover: {
      enabled: true,
      width: RailCardWidth.W_580,
      height: RailCardHeight.H_350,
      showOverlay: false,
      showTitle: false,
      showMeta: false,
      showPlayButton: false,
      showInfo: false,
    },
  },

  [ContentRailType.ARTIST]: {
    variant: RailCardVariant.ARTIST,
    width: RailCardWidth.W_220,
    height: RailCardHeight.H_300,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    borderRadius: 8,
    gap: 22,
    showTitle: true,
    showSubtitle: true,
    hover: {
      enabled: true,
      scale: 1.08,
      showOverlay: false,
    },
  },

  [ContentRailType.SERIES_MIXED]: {
    variant: RailCardVariant.SERIES_MIXED,
    width: RailCardWidth.W_480,
    height: RailCardHeight.H_300,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    borderRadius: 8,
    gap: 16,
    showTitle: false,
    hover: {
      enabled: true,
      scale: 1.08,
      showOverlay: false,
      showTitle: false,
      showPlayButton: false,
    },
  },

  [ContentRailType.GENRE]: {
    variant: RailCardVariant.GENRE,
    width: RailCardWidth.W_220,
    height: RailCardHeight.H_98,
    aspectRatio: RailCardAspectRatio.GENRE_20_9,
    borderRadius: 8,
    gap: 16,
    showTitle: true,
    hover: {
      enabled: true,
      scale: 1.04,
      showOverlay: false,
    },
  },

  [ContentRailType.JOJO_GOLD]: {
    variant: RailCardVariant.PORTRAIT,
    width: RailCardWidth.W_240,
    height: RailCardHeight.H_350,
    aspectRatio: RailCardAspectRatio.PORTRAIT_2_3,
    borderRadius: 8,
    gap: 16,
    showTitle: false,
    hover: {
      enabled: true,
      type: "card",
      scale: 1.08,
      showOverlay: false,
      showTitle: false,
      showPlayButton: false,
    },
  },

  [ContentRailType.RED_CARPET]: {
    variant: RailCardVariant.LANDSCAPE,
    width: RailCardWidth.W_580,
    height: RailCardHeight.H_350,
    aspectRatio: RailCardAspectRatio.WIDESCREEN_16_9,
    borderRadius: 16,
    gap: 16,
    showTitle: true,
    showMeta: true,
    hover: {
      enabled: true,
      scale: 1.02,
      showOverlay: false,
      showPlayButton: false,
    },
  },
};
