import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@store/useAuthStore";
import { useLocaleStore } from "@store/useLocaleStore";
import { logger } from "@lib/logger/logger";
import { ContentRailItem } from "@/components/content-rail/config/contentRail.types";
import { mapApiRailItem } from "@/components/content-rail/utils/contentRail.mapper";
import { getContentRailById } from "../api/getContentRailById";

type RailApiResponse = {
  data?: {
    content_rail_items?: Record<string, unknown>[];
    cr_items?: Record<string, unknown>[];
    cr_display_type?: string | number;
    display_type?: string | number;
    total_pages?: number | string;
  };
  metaData?: {
    total_pages?: number | string;
  };
  metadata?: {
    total_pages?: number | string;
  };
  [key: string]: unknown;
};

const railCache: Record<
  string | number,
  { items: ContentRailItem[]; loadedPages: Set<number>; maxPages: number }
> = {};

const inFlightRequests: Record<string, Promise<any> | undefined> = {};

let cachedSessionId: string | null = null;
let cachedLocale: string | null = null;

export function useRailItems(
  railId: string | number | undefined,
  initialItems: ContentRailItem[],
  totalPages: number = 1,
  limit: number = 20,
  bypassCache: boolean = false
) {
  const sessionId = useAuthStore((state) => state.token);
  const locale = useLocaleStore((state) => state.locale);

  // Clear cache if session or locale changes
  if (sessionId !== cachedSessionId || locale !== cachedLocale) {
    Object.keys(railCache).forEach((key) => delete railCache[key]);
    cachedSessionId = sessionId;
    cachedLocale = locale;
  }

  // Synchronously compute initial state from cache if present
  const getInitialState = () => {
    if (railId && railCache[railId] && !bypassCache) {
      return {
        items: railCache[railId].items,
        loadedPages: new Set(railCache[railId].loadedPages),
        maxPages: railCache[railId].maxPages,
      };
    }
    return {
      items: initialItems,
      loadedPages: new Set([1]),
      maxPages: totalPages,
    };
  };

  const initialState = getInitialState();

  const [items, setItems] = useState<ContentRailItem[]>(initialState.items);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(initialState.loadedPages);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [maxPages, setMaxPages] = useState(initialState.maxPages);

  // Track the pages currently in transit to prevent duplicate requests
  const fetchingPagesRef = useRef<Set<number>>(new Set());

  // Update maxPages if the prop changes
  useEffect(() => {
    if (railId && railCache[railId] && !bypassCache) {
      if (totalPages > railCache[railId].maxPages) {
        railCache[railId].maxPages = totalPages;
        setMaxPages(totalPages);
      }
    } else {
      setMaxPages(totalPages);
    }
  }, [totalPages, railId, bypassCache]);

  // Sync state if initialItems or railId changes (e.g., on language change)
  useEffect(() => {
    if (railId && railCache[railId] && !bypassCache) {
      setItems(railCache[railId].items);
      setLoadedPages(new Set(railCache[railId].loadedPages));
      setMaxPages(railCache[railId].maxPages);
    } else {
      setItems(initialItems);
      setLoadedPages(new Set([1]));
      setMaxPages(totalPages);
    }
    fetchingPagesRef.current.clear();
  }, [initialItems, railId, totalPages, bypassCache]);

  // Keep railCache in sync with state changes
  useEffect(() => {
    if (railId && !bypassCache) {
      railCache[railId] = {
        items,
        loadedPages: new Set(loadedPages),
        maxPages,
      };
    }
  }, [railId, items, loadedPages, maxPages, bypassCache]);

  const fetchPage = useCallback(
    async (pageNum: number) => {
      if (
        !railId ||
        maxPages <= 0 ||
        pageNum > maxPages ||
        loadedPages.has(pageNum) ||
        fetchingPagesRef.current.has(pageNum)
      ) {
        return;
      }

      const requestKey = `${railId}_page_${pageNum}`;

      // Deduplicate concurrent/in-flight requests for the exact same page & rail
      if (inFlightRequests[requestKey]) {
        logger.info(
          `[useRailItems] Reusing existing in-flight request for rail ${railId} page ${pageNum}`
        );
        try {
          await inFlightRequests[requestKey];
          // Once the other instance's promise finishes, sync items and pages from the global railCache
          if (railCache[railId]) {
            setItems(railCache[railId].items);
            setLoadedPages(new Set(railCache[railId].loadedPages));
            setMaxPages(railCache[railId].maxPages);
          }
        } catch (err) {
          logger.error(
            `[useRailItems] In-flight request failed for rail ${railId} page ${pageNum}:`,
            err
          );
        }
        return;
      }

      fetchingPagesRef.current.add(pageNum);
      setIsLoadingMore(true);

      let apiPromise: Promise<unknown> | null = null;

      try {
        logger.info(
          `[useRailItems] Fetching page ${pageNum} for rail ${railId}...`
        );

        apiPromise = getContentRailById(
          railId,
          pageNum,
          limit,
          sessionId ?? undefined
        );
        inFlightRequests[requestKey] = apiPromise;

        const response = (await apiPromise) as RailApiResponse;

        const rawItems =
          response?.data?.content_rail_items ||
          response?.data?.cr_items ||
          [];

        if (Array.isArray(rawItems)) {
          const displayType =
            response?.data?.cr_display_type || response?.data?.display_type;
          const mappedNewItems = rawItems.map((item, idx: number) =>
            mapApiRailItem(item as Record<string, unknown>, idx, displayType)
          );

          setItems((prevItems) => {
            const existingIds = new Set(prevItems.map((item) => item.id));
            const filteredNew = mappedNewItems.filter(
              (item) => !existingIds.has(item.id)
            );
            return [...prevItems, ...filteredNew];
          });
        }

        setLoadedPages((prev) => {
          const updated = new Set(prev);
          updated.add(pageNum);
          return updated;
        });

        const responseMeta = (
          response?.metaData ||
          response?.["meta-data"] ||
          response?.metadata
        ) as any;
        const totalPagesMeta =
          Number(responseMeta?.total_pages) ||
          Number(response?.data?.total_pages);
        if (totalPagesMeta && totalPagesMeta > maxPages) {
          setMaxPages(totalPagesMeta);
        }
      } catch (err) {
        logger.error(
          `[useRailItems] Failed to fetch page ${pageNum} for rail ${railId}:`,
          err
        );
      } finally {
        fetchingPagesRef.current.delete(pageNum);
        delete inFlightRequests[requestKey];
        setIsLoadingMore(fetchingPagesRef.current.size > 0);
      }
    },
    [railId, loadedPages, maxPages, sessionId, limit]
  );

  const loadNextPage = useCallback(() => {
    // If any page is currently being fetched, do not start another fetch to prevent parallel overlaps
    if (fetchingPagesRef.current.size > 0) return;

    // If maxPages is 0, don't load anything!
    if (maxPages <= 0) return;

    const highestLoaded = Math.max(...Array.from(loadedPages));
    const nextPage = highestLoaded + 1;
    if (nextPage <= maxPages) {
      fetchPage(nextPage);
    }
  }, [loadedPages, maxPages, fetchPage]);

  return {
    items,
    isLoadingMore,
    loadNextPage,
    hasMore: Math.max(...Array.from(loadedPages)) < maxPages,
  };
}
