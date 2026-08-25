/**
 * Watchlist Store
 * Zustand store to manage user's watchlist using Socket.IO connection.
 */

import { create } from "zustand";
import { socketClient } from "@/lib/socket/socket.client";
import { useLocaleStore } from "@store/useLocaleStore";
import { decryptSocketData } from "@/lib/socket/decryptResponse";
import { logger } from "@lib/logger/logger";
import { analyticsService } from "@/shared/analytics";

export interface WatchlistAsset {
  asset_id: number;
  assetId?: number;
  asset_title: string;
  assetTitle?: string;
  poster: any[];
  landscape?: any[];
  asset_type?: number;
  assetTypeCode?: number;
  asset_description?: string;
  [key: string]: any;
}

interface WatchlistStore {
  assets: WatchlistAsset[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  hasFetchedInitial: boolean;
  
  // Actions
  fetchWatchlist: (page?: number) => void;
  toggleWatchlist: (assetId: number, inWatchlist: boolean, assetPayload?: any) => void;
  clearWatchlist: () => void;
  handleSocketResponse: (rawResponse: any) => void;
}

export const useWatchlistStore = create<WatchlistStore>((set, get) => ({
  assets: [],
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  isLoading: false,
  isError: false,
  errorMessage: null,
  hasFetchedInitial: false,

  fetchWatchlist: (page = 1) => {
    if (page === 1) {
      set({
        assets: [],
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        isLoading: true,
        isError: false,
        errorMessage: null,
      });
    } else {
      set({ isLoading: true });
    }

    logger.info('[WatchlistStore] Requesting watchlist', { page });
    
    const currentLocale = useLocaleStore.getState().locale;
    // Emit "watchlist" request using the socket Client's emitRequest to support encryption & req wrapping
    socketClient.emitRequest("watchlist", {
      page: page,
      limit: 20,
      language: currentLocale === "gu" ? 2 : 1,
      device_type_code: 2,
    });
  },

  toggleWatchlist: (assetId, inWatchlist, assetPayload) => {
    logger.info('[WatchlistStore] Toggling watchlist interaction', { assetId, inWatchlist });
    
    // Emit "watchlist-interaction" request using the socket Client's emitRequest
    socketClient.emitRequest("watchlist-interaction", {
      asset_id: assetId,
      in_watchlist: inWatchlist,
    });

    // Track watchlist analytics
    try {
      const assetTitle = assetPayload?.title || assetPayload?.asset_title || "";
      const assetType = assetPayload?.assetTypeCode || assetPayload?.asset_type || 1;
      const videoType = assetType === 2 ? 'series' : 'movie';

      if (inWatchlist) {
        analyticsService.trackContentAddedToWatchlist({
          content_id: String(assetId),
          content_type: videoType,
          title: assetTitle,
        });
      } else {
        analyticsService.trackContentRemovedFromWatchlist({
          content_id: String(assetId),
          content_type: videoType,
          title: assetTitle,
        });
      }
    } catch (err) {
      logger.warn('[WatchlistStore] Failed to track watchlist interaction', err);
    }

    // Optimistically update the local state immediately for a fast premium UI response
    set((state) => {
      if (inWatchlist) {
        // Prevent duplicates
        const alreadyExists = state.assets.some(
          (a) => Number(a.asset_id ?? a.assetId) === Number(assetId)
        );
        if (alreadyExists) return {};

        const newAsset: WatchlistAsset = {
          asset_id: assetId,
          assetId: assetId,
          asset_title: assetPayload?.title || assetPayload?.asset_title || "",
          assetTitle: assetPayload?.title || assetPayload?.asset_title || "",
          poster: assetPayload?.poster || [],
          landscape: assetPayload?.landscape || [],
          asset_type: assetPayload?.assetTypeCode || assetPayload?.asset_type || 1,
          asset_description: assetPayload?.description || assetPayload?.asset_description || "",
          ...assetPayload,
        };

        return {
          assets: [newAsset, ...state.assets],
          totalItems: state.totalItems + 1,
        };
      } else {
        const filtered = state.assets.filter(
          (a) => Number(a.asset_id ?? a.assetId) !== Number(assetId)
        );
        return {
          assets: filtered,
          totalItems: Math.max(0, state.totalItems - 1),
        };
      }
    });
  },

  clearWatchlist: () => {
    set({
      assets: [],
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      isLoading: false,
      isError: false,
      errorMessage: null,
      hasFetchedInitial: false,
    });
  },

  handleSocketResponse: (rawResponse) => {
    try {
      const response = decryptSocketData(rawResponse);
      if (!response) {
        logger.warn('[WatchlistStore] Decryption returned null — ignoring');
        return;
      }

      logger.info('[WatchlistStore] Decrypted response', {
        type: typeof response,
        keys: typeof response === 'object' ? Object.keys(response).slice(0, 10) : [],
        en: response?.en,
      });

      // Identify event name — try multiple paths
      const eventName = response.en || response.event_name || response.event || '';
      
      // Check if this is a watchlist response — the API returns:
      //   { data: { watchlist: [...] }, "meta-data": { total, page, ... } }
      // No "en" field is present, so we detect by structure.
      const isWatchlistResponse = eventName === 'watchlist' 
        || response.watchlistData 
        || response.watchlist_data
        || Array.isArray(response.watchlist)
        || Array.isArray(response.data?.watchlist);

      const isWatchlistInteraction = eventName === 'watchlist-interaction' 
        || eventName === 'watchlist_interaction';

      if (isWatchlistResponse) {
        logger.info('[WatchlistStore] Processing watchlist response');
        
        // Try multiple paths to find the watchlist items array
        const watchlistData = response.watchlistData 
          || response.watchlist_data 
          || response.data 
          || response;
          
        const watchlistItems = watchlistData.watchlist 
          || watchlistData.items 
          || watchlistData.list
          || (Array.isArray(watchlistData) ? watchlistData : []);
        
        // Pagination may live in "meta-data" (with hyphen) or watchlistData
        const metaData = response['meta-data'] || response.metadata || response.meta || {};
          
        const currentPage = metaData.page 
          || metaData.currentPage 
          || metaData.current_page 
          || watchlistData.currentPage 
          || watchlistData.current_page 
          || watchlistData.page 
          || 1;
          
        const total = metaData.total 
          || metaData.totalCount 
          || metaData.total_count
          || watchlistData.total 
          || watchlistData.totalCount 
          || watchlistData.total_count 
          || watchlistItems.length 
          || 0;
          
        const limit = metaData.limit || metaData.per_page || 20;
        const totalPages = metaData.totalPages 
          || metaData.total_pages 
          || Math.ceil(total / limit) || 1;

        logger.info('[WatchlistStore] Watchlist data parsed', {
          itemCount: watchlistItems.length,
          currentPage,
          total,
          totalPages,
          sampleItem: watchlistItems[0] ? Object.keys(watchlistItems[0]).slice(0, 8) : [],
        });

        set((state) => {
          const mergedAssets = currentPage === 1 
            ? watchlistItems 
            : [...state.assets, ...watchlistItems];

          const seen = new Set<number>();
          const uniqueAssets = mergedAssets.filter((item: WatchlistAsset) => {
            const id = Number(item.asset_id ?? item.assetId);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });

          return {
            assets: uniqueAssets,
            currentPage,
            totalPages,
            totalItems: total,
            isLoading: false,
            isError: false,
            errorMessage: null,
            hasFetchedInitial: true,
          };
        });
      } else if (isWatchlistInteraction) {
        logger.info('[WatchlistStore] Received watchlist-interaction acknowledgment', response);
      } else {
        // Not a watchlist event — ignore silently (could be profile, config, etc.)
        logger.info('[WatchlistStore] Ignoring non-watchlist socket event', { eventName });
      }
    } catch (err) {
      logger.error('[WatchlistStore] Error processing socket response', { err });
      // Only set error state if we were actually loading watchlist
      if (get().isLoading) {
        set({ 
          isLoading: false, 
          isError: true, 
          errorMessage: err instanceof Error ? err.message : 'Failed to parse watchlist' 
        });
      }
    }
  },
}));
