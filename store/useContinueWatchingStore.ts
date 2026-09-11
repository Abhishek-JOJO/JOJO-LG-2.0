/**
 * Continue Watching Store
 * Zustand store to manage user's continue watching rail using WebSocket connection.
 */

import { create } from "zustand";
import { socketClient } from "@/lib/socket/socket.client";
import { decryptSocketData } from "@/lib/socket/decryptResponse";
import { mapApiRailItem } from "@/components/content-rail/utils/contentRail.mapper";
import { ContentRailItem } from "@/components/content-rail/config/contentRail.types";
import { logger } from "@lib/logger/logger";
import { useAuthStore } from "./useAuthStore";

interface ContinueWatchingStore {
  items: ContentRailItem[];
  isLoading: boolean;
  isError: boolean;

  // Actions
  fetchItems: () => void;
  removeItem: (assetId: string) => void;
  clearItems: () => void;
  handleSocketResponse: (rawResponse: any) => Promise<void>;
}

export const useContinueWatchingStore = create<ContinueWatchingStore>((set, get) => ({
  items: [],
  isLoading: false,
  isError: false,

  fetchItems: () => {
    const isGuest = useAuthStore.getState().user?.isGuest ?? false;
    if (isGuest) {
      logger.info("[ContinueWatchingStore] Bypassing fetching continue watching list for guest user");
      return;
    }
    logger.info("[ContinueWatchingStore] Fetching continue watching list");
    set({ isLoading: true });
    socketClient.emitRequest("continue-watching", {}, true);
  },

  removeItem: (assetId) => {
    // Guard: Prevent "remove-continue-watching" on Asset Detail Page (Section 10 of heartbat.md)
    if (typeof window !== "undefined" && window.location.pathname.includes("/asset/")) {
      logger.info("[ContinueWatchingStore] Bypassing remove-continue-watching request on asset detail page", { assetId });
      return;
    }

    logger.info("[ContinueWatchingStore] Requesting removal of continue watching item", { assetId });

    // Emit remove request using socket client
    socketClient.emitRequest("remove-continue-watching", {
      asset_id: assetId,
    }, true);

    // Optimistically remove the card from the UI
    set((state) => {
      const filtered = state.items.filter((item) => String(item.id) !== String(assetId));
      
      // Dispatch browser custom event for compatibility
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("continueWatchingUpdate", {
            detail: { items: filtered },
          })
        );
      }
      
      return { items: filtered };
    });
  },

  clearItems: () => {
    set({ items: [], isLoading: false, isError: false });
  },

  handleSocketResponse: async (rawResponse) => {
    try {
      const response = await decryptSocketData(rawResponse);
      if (!response) return;

      const metaData = response["meta-data"] || response.metadata || response.meta || {};
      const eventName = response.en || metaData.en || response.event_name || response.event || "";

      const isContinueWatchingResponse =
        eventName === "continue-watching" ||
        eventName === "continue_watching" ||
        response.continueWatching ||
        response.continue_watching ||
        (eventName === "continue-watching" && Array.isArray(response.data)) ||
        Array.isArray(response.data?.continue_watching) ||
        Array.isArray(response.data?.continueWatching);

      if (isContinueWatchingResponse) {
        logger.info("[ContinueWatchingStore] Processing continue watching response");

        const cwData = response.data || response;
        const cwItems = Array.isArray(cwData)
          ? cwData
          : (cwData.continue_watching ||
             cwData.continueWatching ||
             cwData.items ||
             cwData.list ||
             []);

        const mappedItems = cwItems.map((item: any, idx: number) => {
          // Map to ContentRailItem using type code 9 (CONTINUE_WATCHING)
          return mapApiRailItem(item, idx, 9);
        });

        logger.info("[ContinueWatchingStore] Mapped items count", { count: mappedItems.length });

        set({
          items: mappedItems,
          isLoading: false,
          isError: false,
        });

        // Fire browser level custom event for other pages or vanilla JS listeners
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("continueWatchingUpdate", {
              detail: { items: mappedItems },
            })
          );
        }
      } else if (eventName === "remove-continue-watching" || eventName === "remove_continue_watching") {
        logger.info("[ContinueWatchingStore] Received remove-continue-watching acknowledgment", response);
      }
    } catch (err) {
      logger.error("[ContinueWatchingStore] Error parsing socket response", err);
    }
  },
}));
