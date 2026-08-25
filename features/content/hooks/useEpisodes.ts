"use client";

import { useCallback, useState, useEffect } from 'react';
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
    if (!hasMore || isLoading) return;

    const nextPage = loadedPageCount + 1;
    setIsLoading(true);

    try {
      const episodes = await fetchPage(selectedSeasonIndex, nextPage);
      setLoadedPages((prev) => ({
        ...prev,
        [selectedSeasonIndex]: [...(prev[selectedSeasonIndex] ?? []), episodes],
      }));
    } catch (err) {
      logger.error('[useEpisodes] Failed to load more', { selectedSeasonIndex, nextPage, err });
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, loadedPageCount, fetchPage, selectedSeasonIndex]);

  return {
    selectedSeasonIndex,
    displayedEpisodes,
    isLoading,
    hasMore,
    handleSeasonChange,
    loadMoreEpisodes,
  };
}
