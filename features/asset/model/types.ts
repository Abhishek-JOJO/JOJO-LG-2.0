/**
 * Asset Feature — Type Definitions
 *
 * Matches the API response from GET /asset/{assetId}
 */

export interface AssetPoster {
  url: string;
  lightFade: string;
  darkFade: string;
  ratio_id: number;
  lang_id: number;
  is_default: boolean;
}

export interface AssetEpisode {
  asset_id: number;
  asset_type: number;
  asset_genre: string[];
  asset_total_duration: string;
  asset_certification: string;
  asset_classifications: string[];
  asset_tags: string[];
  asset_category: number;
  parent_id: number;
  episode_number: string;
  asset_title: string;
  name_analytics: string;
  asset_description: string;
  asset_short_description: string;
  isintop10: boolean;
  numberintop10: string | number;
  poster: AssetPoster[];
}

export interface AssetSeason {
  asset_id: number;
  asset_type: number;
  asset_genre: string[];
  asset_certification: string;
  asset_classifications: string[];
  asset_category: number;
  season_number: string;
  asset_title: string;
  name_analytics: string;
  total_pages: number;
  current_page: number;
  limit: number;
  total_episodes: number;
  episodes: AssetEpisode[];
}

export interface AssetAds {
  ad_repeat: boolean;
  ad_repeat_duration: number;
  mid_roll_points: number[];
}

export interface AssetData {
  asset_id: number;
  asset_type: number;
  asset_title: string;
  name_analytics: string;
  asset_description: string;
  asset_short_description: string;
  asset_category: number;
  asset_genre: string[];
  asset_certification: string;
  asset_release_date: string;
  title_image: string;
  poster: AssetPoster[];
  landscape: AssetPoster[];
  portrait: AssetPoster[];
  seasons: AssetSeason[];
  ads: AssetAds;
  preview_url: string;
  seo_title: string;
  seo_description: string;
  isintop10: boolean;
  numberintop10: number | string;
}

export interface AssetApiResponse {
  data: AssetData;
  metaData: {
    message: string;
    status: number;
  };
}
