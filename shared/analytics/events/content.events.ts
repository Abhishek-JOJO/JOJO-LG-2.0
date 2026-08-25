/**
 * Content Analytics Events
 *
 * Typed event builders for content browsing, discovery, and interactions
 */

import { EVENT_NAMES } from '../constants/analytics.constants';
import { EventCriticality } from '../model/provider.types';
import { type AnalyticsEvent } from '../model/common.types';

export interface ContentClickedEvent {
  asset_id?: string | number;
  asset_name?: string;
  asset_title?: string;
  asset_type?: string;
  asset_category?: string;
  content_rail_id?: string | number;
  rail_id?: string | number;
  content_rail_name?: string;
  rail_name?: string;
  content_rail_display_type?: string;
  rail_display_type?: string;
  in_top_10?: boolean;
  is_top_10?: boolean;
  number_in_top_10?: number;
  item_position?: number;
  content_id?: string;
  content_type?: string;
  source?: string;
  [key: string]: any;
}

export interface NavigationClickedEvent {
  destination: string;
  source?: string;
}

export interface ArtistClickedEvent {
  artist_id: string;
  artist_name?: string;
  source?: string;
}

export interface GenreClickedEvent {
  genre_id: string;
  genre_name?: string;
  source?: string;
}

export interface ContentDetailPageEvent {
  content_id: string;
  content_type?: string;
  title?: string;
}

export interface ContentAddedToWatchlistEvent {
  content_id: string;
  content_type?: string;
  title?: string;
}

export interface ContentRemovedFromWatchlistEvent {
  content_id: string;
  content_type?: string;
  title?: string;
}

export interface AssetCastClickedEvent {
  content_id: string;
  cast_id?: string;
  cast_name?: string;
}

export interface ContentEpisodeClickedEvent {
  content_id: string;
  episode_id: string;
  season_number?: number;
  episode_number?: number;
}

export interface ContentTrailerClickedEvent {
  content_id: string;
  trailer_id?: string;
}

export interface ContentSharedEvent {
  content_id: string;
  content_type?: string;
  share_method?: string;
}

export interface SearchPerformedEvent {
  query: string;
  results_count?: number;
}

export interface StartWatchingClickedEvent {
  content_id: string;
  content_type?: string;
}

export interface WatchLaterClickedEvent {
  content_id: string;
  content_type?: string;
}

export const contentEvents = {
  contentClicked: (data: ContentClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CONTENT_CLICKED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  artistClicked: (data: ArtistClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.ARTIST_CLICKED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  genreClicked: (data: GenreClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.GENRE_CLICKED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  contentDetailPage: (data: ContentDetailPageEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CONTENT_DETAIL_PAGE,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  contentAddedToWatchlist: (data: ContentAddedToWatchlistEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CONTENT_ADDED_TO_WATCHLIST,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  contentRemovedFromWatchlist: (data: ContentRemovedFromWatchlistEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CONTENT_REMOVED_FROM_WATCHLIST,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  assetCastClicked: (data: AssetCastClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.ASSET_CAST_CLICKED,
    properties: data,
    criticality: EventCriticality.LOW,
  }),

  contentEpisodeClicked: (data: ContentEpisodeClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CONTENT_EPISODE_CLICKED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  contentTrailerClicked: (data: ContentTrailerClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CONTENT_TRAILER_CLICKED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  contentShared: (data: ContentSharedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.CONTENT_SHARED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  searchPerformed: (data: SearchPerformedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.SEARCH_PERFORMED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),

  startWatchingClicked: (data: StartWatchingClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.START_WATCHING_CLICKED,
    properties: data,
    criticality: EventCriticality.HIGH,
  }),

  watchLaterClicked: (data: WatchLaterClickedEvent): AnalyticsEvent => ({
    name: EVENT_NAMES.WATCH_LATER_CLICKED,
    properties: data,
    criticality: EventCriticality.MEDIUM,
  }),
};
