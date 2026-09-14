"use client";

/**
 * EpisodesPanel
 *
 * Slide-in episodes panel overlay shown on top of the player.
 *   - Dark semi-transparent panel on the right ~45% width
 *   - Season dropdown at top
 *   - Scrollable episode list: thumbnail + S1EP1 + title + duration + description
 *   - Currently playing episode highlighted
 *   - Click episode to switch
 */

import React, { memo, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { AssetSeason, AssetEpisode } from '@features/asset/model/types';
import { useEpisodes } from '@/features/content/hooks/useEpisodes';
import type { Episode, Season } from '@/features/content/model/types';
import { useFocusable, setFocus, FocusContext } from '@noriginmedia/norigin-spatial-navigation';

function FocusableSeasonTrigger({ onClick, label, open }: { onClick: () => void; label: string; open: boolean }) {
  const { ref, focused } = useFocusable({ focusKey: 'episodes-season-trigger', onEnterPress: onClick });
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 bg-theme_1/[0.06] hover:bg-theme_1/[0.12] text-theme_1 text-xs font-semibold rounded-lg transition-all border border-theme_1/10 hover:border-theme_1/20 active:scale-98 shadow-md outline-none ${
        focused ? 'ring-2 ring-white bg-theme_1/[0.12]' : ''
      }`}
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      <span className="opacity-95">{label}</span>
      <ChevronDownIcon open={open} />
    </button>
  );
}

function FocusableSeasonOption({
  focusKey,
  isVisible,
  isSelected,
  label,
  onClick,
}: {
  focusKey: string;
  isVisible: boolean;
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  const { ref, focused } = useFocusable({ focusKey, focusable: isVisible, onEnterPress: onClick });
  return (
    <button
      ref={ref}
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={`w-full text-left px-4 py-3 text-xs font-semibold transition-all outline-none ${
        isSelected
          ? 'text-[#ff6b00] bg-theme_1/[0.08] border-l-2 border-[#ff6b00]'
          : 'text-theme_1/80 hover:text-theme_1 hover:bg-theme_1/[0.05] border-l-2 border-transparent'
      } ${focused ? 'bg-neutral-800 ring-2 ring-inset ring-white' : ''}`}
    >
      {label}
    </button>
  );
}

function FocusableCloseBtn({ onClick }: { onClick: () => void }) {
  const { ref, focused } = useFocusable({ focusKey: 'episodes-close-btn', onEnterPress: onClick });
  return (
    <button
      ref={ref}
      onClick={onClick}
      aria-label="Close episodes panel"
      className={`flex items-center justify-center w-8 h-8 rounded-full bg-theme_1/[0.04] hover:bg-theme_1/[0.12] border border-theme_1/5 hover:border-theme_1/10 transition-all text-theme_1/70 hover:text-theme_1 active:scale-95 outline-none ${
        focused ? 'ring-2 ring-white bg-theme_1/[0.12] text-theme_1' : ''
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  );
}

function FocusableLoadMoreBtn({ isLoading, onClick }: { isLoading: boolean; onClick: () => void }) {
  const { ref, focused } = useFocusable({ focusable: !isLoading, onEnterPress: onClick });
  return (
    <button
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={isLoading}
      className={`mt-4 mx-5 mb-6 w-[calc(100%-40px)] py-2.5 bg-theme_1/[0.06] hover:bg-theme_1/[0.12] disabled:opacity-50 text-theme_1 text-xs font-semibold rounded-lg border border-theme_1/10 hover:border-theme_1/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-md outline-none ${
        focused ? 'ring-2 ring-white bg-theme_1/[0.12]' : ''
      }`}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-theme_1/30 border-t-theme_1 rounded-full animate-spin" />
      ) : (
        "Load More Episodes"
      )}
    </button>
  );
}

interface EpisodesPanelProps {
  seasons: AssetSeason[];
  currentEpisodeId?: number | null;
  onEpisodeSelect: (episode: AssetEpisode, season: AssetSeason) => void;
  onClose: () => void;
}

interface FocusableEpisodeCardProps {
  episode: Episode;
  activeSeason: any;
  isActive: boolean;
  posterUrl: string;
  duration: string;
  desc: string;
  onClick: () => void;
  focusKey?: string;
}

function FocusableEpisodeCard({
  episode,
  activeSeason,
  isActive,
  posterUrl,
  duration,
  desc,
  onClick,
  focusKey,
}: FocusableEpisodeCardProps) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onClick,
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`w-full flex gap-3.5 px-5 py-4 text-left transition-all duration-200 group border-b border-theme_1/[0.03] outline-none ${
        focused
          ? 'bg-neutral-800 border-l-4 border-white pl-4 ring-2 ring-inset ring-white scale-[1.01] shadow-2xl z-10'
          : isActive
          ? 'bg-theme_1/[0.06] border-l-4 border-[#ff6b00] pl-4'
          : 'hover:bg-theme_1/[0.03] border-l-4 border-transparent pl-4 hover:pl-[18px]'
      }`}
    >
      <div
        className="shrink-0 rounded-lg overflow-hidden bg-theme_1/[0.04] border border-theme_1/10 relative group-hover:border-theme_1/20 transition-all duration-300"
        style={{ width: 112, height: 63 }}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={episode.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-theme_1/20">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-8 h-8 rounded-full bg-theme_1/10 backdrop-blur-sm border border-theme_1/20 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-theme_1 ml-0.5 animate-pulse">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-[10px] font-bold text-[#ff6b00]/90 uppercase tracking-wider mb-1">
          S{activeSeason.seasonNumber} · EP{episode.episodeNumber}
        </p>
        <p
          className={`text-sm font-semibold leading-snug truncate mb-1 transition-colors ${
            focused ? 'text-white' : isActive ? 'text-[#ff6b00]' : 'text-theme_1/90 group-hover:text-theme_1'
          }`}
        >
          {episode.title}
        </p>
        {duration && (
          <div className="flex items-center gap-1 text-[11px] text-theme_1/45 mb-1.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>{duration}</span>
          </div>
        )}
        {desc && (
          <p className="text-[11px] text-theme_1/40 leading-relaxed line-clamp-2">
            {desc}
          </p>
        )}
      </div>

      {isActive && (
        <div className="shrink-0 self-center bg-[#ff6b00]/10 border border-[#ff6b00]/25 rounded px-2 py-0.5 text-[9px] text-[#ff6b00] font-extrabold uppercase tracking-widest shadow-sm select-none">
          Playing
        </div>
      )}
    </button>
  );
}

const PANEL_CLOSE_MS = 260;

function formatDuration(totalSeconds: string | number): string {
  const secs = typeof totalSeconds === 'string' ? parseFloat(totalSeconds) : totalSeconds;
  if (!secs || isNaN(secs)) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function getDefaultPoster(posters: { url: string; is_default?: boolean; ratio_id?: number }[]): string {
  const def = posters.find((p) => p.is_default);
  return def?.url ?? posters[0]?.url ?? '';
}

function findSeasonIndex(seasons: AssetSeason[], currentEpisodeId?: number | null): number {
  if (!currentEpisodeId) return 0;
  const curIdStr = String(currentEpisodeId);
  const idx = seasons.findIndex((season) =>
    season.episodes.some((episode) => {
      const epIdStr = String(episode.asset_id ?? (episode as any).assetId ?? "");
      return epIdStr === curIdStr;
    })
  );
  return idx >= 0 ? idx : 0;
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="8"
      viewBox="0 0 12 8"
      fill="none"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M1 1l5 5 5-5" stroke="theme_1" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export const EpisodesPanel = memo(function EpisodesPanel({
  seasons,
  currentEpisodeId,
  onEpisodeSelect,
  onClose,
}: EpisodesPanelProps) {
  const initialSeasonIdx = useMemo(() => findSeasonIndex(seasons, currentEpisodeId), [seasons, currentEpisodeId]);

  // Map raw AssetSeason[] or mapped Season[] to content Season[]
  const mappedSeasons = useMemo(() => {
    if (!Array.isArray(seasons)) return [];
    return seasons.map((season: any, idx) => {
      const rawNum = season.season_number ?? season.seasonNumber;
      const seasonNum = rawNum ? parseInt(String(rawNum), 10) : idx + 1;
      const sAssetId = String(season.asset_id ?? season.assetId ?? "");
      const sTitle = season.asset_title ?? season.title ?? `Season ${seasonNum}`;
      return {
        assetId: sAssetId,
        title: sTitle,
        seasonNumber: isNaN(seasonNum) ? idx + 1 : seasonNum,
        totalPages: season.total_pages ?? season.totalPages ?? 1,
        episodes: Array.isArray(season.episodes)
          ? season.episodes.map((ep: any, epIdx: number) => {
              const rawEpNum = ep.episode_number ?? ep.episodeNumber;
              const epNum = rawEpNum ? parseInt(String(rawEpNum), 10) : epIdx + 1;
              const rawDur = ep.asset_total_duration ?? ep.durationSeconds ?? ep.duration;
              const duration = rawDur ? parseFloat(String(rawDur)) : 0;
              
              let posterUrl = '';
              const posterField = ep.poster;
              if (Array.isArray(posterField) && posterField.length > 0) {
                posterUrl = posterField[0].url || '';
              } else if (typeof posterField === 'string') {
                posterUrl = posterField;
              } else if (posterField && typeof posterField === 'object') {
                posterUrl = posterField.url || '';
              }

              return {
                assetId: String(ep.asset_id ?? ep.assetId ?? ""),
                title: ep.asset_title ?? ep.title ?? `Episode ${epNum}`,
                description: ep.asset_description ?? ep.description ?? '',
                durationSeconds: isNaN(duration) ? 0 : duration,
                assetTypeCode: ep.asset_type ?? ep.assetTypeCode ?? '1',
                parentId: String(ep.parent_id ?? ep.parentId ?? ""),
                poster: posterUrl ? {
                  ratioId: 1,
                  url: posterUrl,
                  isDefault: true,
                } : null,
                episodeNumber: isNaN(epNum) ? epIdx + 1 : epNum,
              } satisfies Episode;
            })
          : [],
      } satisfies Season;
    });
  }, [seasons]);

  const {
    selectedSeasonIndex: selectedSeasonIdx,
    displayedEpisodes,
    isLoading,
    hasMore,
    handleSeasonChange,
    loadMoreEpisodes,
  } = useEpisodes({ seasons: mappedSeasons, initialSeasonIndex: initialSeasonIdx });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeEpisodeRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSeason = seasons[selectedSeasonIdx];

  // Focus boundary: while D-pad focus is inside the panel, norigin's default
  // nearest-neighbor search is constrained to this subtree first, so it can't
  // wander back onto the (still-focusable, merely visually occluded)
  // PlayerControls buttons underneath — same pattern AssetDetailModal/SearchModal
  // use to trap focus in a modal.
  const { ref: boundaryRef, focusKey: panelFocusKey } = useFocusable({
    focusKey: 'episodes-panel',
    isFocusBoundary: true,
    preferredChildFocusKey: seasons.length > 1 ? 'episodes-season-trigger' : 'episode-card-0',
  });

  // Mounts fresh whenever the panel opens (parent conditionally renders it) —
  // hand focus into the boundary right away, otherwise it stays wherever it
  // was (on a PlayerControls button the panel now visually covers).
  useEffect(() => {
    const timer = setTimeout(() => setFocus(panelFocusKey), 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setDropdownOpen(false);
    setIsClosing(true);
    // The panel unmounts on close, taking whatever it currently holds focus on
    // with it — without this, D-pad focus is left dangling on nothing (norigin
    // doesn't auto-restore focus when a focused node's DOM element disappears).
    // Mirrors what OTTPlayer's own Back-key handler does for the same panel.
    setFocus('ott-player-main');
    closeTimerRef.current = setTimeout(() => onClose(), PANEL_CLOSE_MS);
  }, [isClosing, onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Scroll to the currently playing episode on open / season change
  useEffect(() => {
    const id = setTimeout(() => {
      activeEpisodeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 120);
    return () => clearTimeout(id);
  }, [selectedSeasonIdx, currentEpisodeId]);

  // Close panel on click outside
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        requestClose();
      }
    };
    const id = setTimeout(() => {
      document.addEventListener('pointerdown', onPointerDown);
    }, 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [requestClose]);

  if (!activeSeason) return null;

  return (
    <div className="absolute inset-0 z-40 flex" aria-label="Episodes panel">
      {/* Left backdrop — fades in, click to close */}
      <div
        className={`flex-1 bg-black/45 player-episodes-backdrop-enter ${isClosing ? 'opacity-0 transition-opacity duration-200' : ''}`}
        onClick={requestClose}
      />

      {/* Panel */}
      <FocusContext.Provider value={panelFocusKey}>
      <div
        ref={(el) => {
          (panelRef as any).current = el;
          if (typeof (boundaryRef as any) === 'function') {
            (boundaryRef as any)(el);
          } else if (boundaryRef) {
            (boundaryRef as any).current = el;
          }
        }}
        className={`h-full flex flex-col ${isClosing ? 'player-episodes-panel-exit' : 'player-episodes-panel-enter'}`}
        style={{
          width: '42%',
          minWidth: 360,
          maxWidth: 560,
          background: 'linear-gradient(180deg, rgba(22,22,22,0.98) 0%, rgba(12,12,12,0.98) 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '-24px 0 48px rgba(0,0,0,0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 shrink-0 border-b border-theme_1/10">
          <div className="relative">
            {seasons.length > 1 ? (
              <>
                <FocusableSeasonTrigger
                  onClick={() => {
                    setDropdownOpen((open) => !open);
                    if (!dropdownOpen) {
                      setTimeout(() => setFocus(`episodes-season-opt-${seasons[selectedSeasonIdx]?.asset_id}`), 50);
                    }
                  }}
                  label={`Season ${activeSeason.season_number}`}
                  open={dropdownOpen}
                />

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setDropdownOpen(false)} />
                    <div
                      className="absolute top-full left-0 mt-2 bg-[#161616]/95 border border-theme_1/10 rounded-xl overflow-hidden z-[60] min-w-[170px] shadow-2xl backdrop-blur-xl player-menu-pop-in"
                      role="listbox"
                    >
                      {seasons.map((season, idx) => (
                        <FocusableSeasonOption
                          key={season.asset_id}
                          focusKey={`episodes-season-opt-${season.asset_id}`}
                          isVisible={dropdownOpen}
                          isSelected={idx === selectedSeasonIdx}
                          label={`Season ${season.season_number}`}
                          onClick={() => {
                            handleSeasonChange(idx);
                            setDropdownOpen(false);
                            setTimeout(() => setFocus('episodes-season-trigger'), 50);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-theme_1 text-sm font-bold tracking-wide px-1 py-0.5">
                Season {activeSeason.season_number}
              </div>
            )}
            <p className="text-[10px] text-theme_1/40 font-medium tracking-wide mt-1.5 px-1">
              {displayedEpisodes.length} episode{displayedEpisodes.length === 1 ? '' : 's'}
            </p>
          </div>

          <FocusableCloseBtn onClick={requestClose} />
        </div>

        {/* ── Episode list ────────────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto py-2 pr-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}
        >
          {displayedEpisodes.map((episode, idx) => {
            const epId = episode.assetId;
            const isActive = String(epId) === String(currentEpisodeId ?? "");
            const posterUrl = episode.poster?.url ?? "";
            const duration = formatDuration(episode.durationSeconds);
            const desc = stripHtml(episode.description);

            return (
              <FocusableEpisodeCard
                key={String(epId)}
                focusKey={idx === 0 ? 'episode-card-0' : undefined}
                episode={episode}
                activeSeason={activeSeason}
                isActive={isActive}
                posterUrl={posterUrl}
                duration={duration}
                desc={desc}
                onClick={() => {
                  let originalEpisode = activeSeason.episodes.find(
                    (ep) => String(ep.asset_id) === String(episode.assetId)
                  );
                  if (!originalEpisode) {
                    originalEpisode = {
                      asset_id: Number(episode.assetId),
                      asset_type: episode.assetTypeCode as number,
                      asset_genre: activeSeason.asset_genre ?? [],
                      asset_total_duration: String(episode.durationSeconds),
                      asset_certification: activeSeason.asset_certification ?? "",
                      asset_classifications: activeSeason.asset_classifications ?? [],
                      asset_tags: [],
                      asset_category: activeSeason.asset_category ?? 1,
                      parent_id: Number(episode.parentId),
                      episode_number: String(episode.episodeNumber),
                      asset_title: episode.title,
                      name_analytics: "",
                      asset_description: episode.description,
                      asset_short_description: "",
                      isintop10: false,
                      numberintop10: "",
                      poster: episode.poster ? [
                        {
                          url: episode.poster.url,
                          lightFade: "",
                          darkFade: "",
                          ratio_id: episode.poster.ratioId,
                          lang_id: 1,
                          is_default: episode.poster.isDefault,
                        }
                      ] : [],
                    };
                  }
                  onEpisodeSelect(originalEpisode, activeSeason);
                }}
              />
            );
          })}

          {hasMore && (
            <FocusableLoadMoreBtn isLoading={isLoading} onClick={loadMoreEpisodes} />
          )}
        </div>
      </div>
      </FocusContext.Provider>
    </div>
  );
});
