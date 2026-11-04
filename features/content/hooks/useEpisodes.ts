"use client";

import { useCallback, useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@store/useAuthStore';
import { useLocaleStore } from '@store/useLocaleStore';
import { getEpisodes } from '../api/getEpisodes';
import { mapEpisodePage } from '../model/mapper';
import { logger } from '@lib/logger/logger';
import type { Season, Episode } from '../model/types';

interface UseEpisodesOptions {
  seasons: Season[];
  initialSeasonIndex?: number;
}

interface UseEpisodesReturn {
  selectedSeasonIndex: number;
  displayedEpisodes: Episode[];
  isLoading: boolean;
  hasMore: boolean;
  handleSeasonChange: (index: number) => void;
  loadMoreEpisodes: () => Promise<void>;
}

export function useEpisodes({ seasons, initialSeasonIndex = 0 }: UseEpisodesOptions): UseEpisodesReturn {
  const sessionId = useAuthStore((state) => state.token);

  // Map of seasonIndex → array of episode pages
  // e.g. { 0: [[ep1..ep10], [ep11..ep20]], 1: [[ep1..ep10]] }
  const [loadedPages, setLoadedPages] = useState<Record<number, Episode[][]>>(() => {
    const initial: Record<number, Episode[][]> = {};
    seasons.forEach((season, idx) => {
      if (season.episodes && season.episodes.length > 0) {
        initial[idx] = [season.episodes];
      }
    });
    return initial;
  });

  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(initialSeasonIndex);
  const [isLoading, setIsLoading] = useState(false);
  // Fast D-pad scrolling through the last few episodes can fire loadMoreEpisodes
  // twice (Down-arrow's own call + the onFocus-triggered lookahead) before React
  // commits the setIsLoading(true) from the first call — a plain state read is
  // stale within that same synchronous tick, so a ref closes that race window
  // immediately instead of one render late.
  const isLoadingRef = useRef(false);
  // "seasonAssetId:page" for every page requested or loaded. isLoadingRef only
  // covers one request at a time: a keypress handled by a stale closure right
  // after a page landed still saw the old page count and fetched that page
  // again. Appended twice, its episodes repeated (Season 2 listed 40 of 34),
  // and the duplicate React keys left those rows on screen under Season 3.
  const requestedPagesRef = useRef(new Set<string>());
  const locale = useLocaleStore((s) => s.locale);

  // Synchronize state when seasons list or locale changes (e.g. from empty to loaded, switching shows, or language change)
  const seasonsHash = `${locale}:${seasons.map((s) => `${s.assetId}-${s.episodes?.length || 0}`).join(',')}`;
  const [lastSeasonsHash, setLastSeasonsHash] = useState(seasonsHash);

  useEffect(() => {
    if (seasonsHash !== lastSeasonsHash) {
      setLastSeasonsHash(seasonsHash);
      const initial: Record<number, Episode[][]> = {};
      seasons.forEach((season, idx) => {
        if (season.episodes && season.episodes.length > 0) {
          initial[idx] = [season.episodes];
        }
      });
      setLoadedPages(initial);
      requestedPagesRef.current.clear();
      setSelectedSeasonIndex(initialSeasonIndex);
      setIsLoading(false);
    }
  }, [seasonsHash, lastSeasonsHash, seasons, initialSeasonIndex]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const displayedEpisodes: Episode[] = (loadedPages[selectedSeasonIndex] ?? []).flat();

  const selectedSeason = seasons[selectedSeasonIndex];
  const loadedPageCount = loadedPages[selectedSeasonIndex]?.length ?? 0;
  const totalPages = selectedSeason?.totalPages ?? 1;
  const hasMore = loadedPageCount < totalPages;

  // ── Internal fetch ─────────────────────────────────────────────────────────

  const fetchPage = useCallback(
    async (seasonIndex: number, page: number): Promise<Episode[]> => {
      const season = seasons[seasonIndex];
      if (!season) return [];

      logger.info('[useEpisodes] Fetching page', { seasonId: season.assetId, page });

      const response = await getEpisodes(season.assetId, page, sessionId ?? undefined);
      const result = mapEpisodePage(
        response,
        page,
        response.metaData ? (response as { metaData?: { total_pages?: number } }).metaData?.total_pages ?? totalPages : totalPages
      );

      return result.episodes;
    },
    [seasons, sessionId, totalPages]
  );

  // ── Season tab change ──────────────────────────────────────────────────────

  const handleSeasonChange = useCallback(
    async (index: number) => {
      setSelectedSeasonIndex(index);

      // Already loaded → just switch, no API call
      if (loadedPages[index]) return;

      setIsLoading(true);
      try {
        const episodes = await fetchPage(index, 1);
        setLoadedPages((prev) => ({ ...prev, [index]: [episodes] }));
      } catch (err) {
        logger.error('[useEpisodes] Failed to load season', { index, err });
      } finally {
        setIsLoading(false);
      }
    },
    [loadedPages, fetchPage]
  );

  // ── Load more ──────────────────────────────────────────────────────────────

  const loadMoreEpisodes = useCallback(async () => {
    if (!hasMore || isLoadingRef.current) return;

    const nextPage = loadedPageCount + 1;
    const requestKey = `${seasons[selectedSeasonIndex]?.assetId}:${nextPage}`;
    if (requestedPagesRef.current.has(requestKey)) return;
    requestedPagesRef.current.add(requestKey);
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const episodes = await fetchPage(selectedSeasonIndex, nextPage);
      setLoadedPages((prev) => {
        const pages = prev[selectedSeasonIndex] ?? [];
        // Pages land in order; one already at this position is a repeat.
        if (pages.length >= nextPage) return prev;
        return { ...prev, [selectedSeasonIndex]: [...pages, episodes] };
      });
    } catch (err) {
      requestedPagesRef.current.delete(requestKey); // let the next scroll retry it
      logger.error('[useEpisodes] Failed to load more', { selectedSeasonIndex, nextPage, err });
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [hasMore, loadedPageCount, fetchPage, selectedSeasonIndex, seasons]);

  return {
    selectedSeasonIndex,
    displayedEpisodes,
    isLoading,
    hasMore,
    handleSeasonChange,
    loadMoreEpisodes,
  };
}
