"use client";

import { useEffect, useCallback, useRef } from "react";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useAuthStore } from "@store/useAuthStore";
import { useWatchlistStore } from "@store/useWatchlistStore";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { Loader } from "@components/common/Loader";
import { Trash2 } from "lucide-react";
import { BaseContentCard } from "@/components/content-rail/cards/BaseContentCard";
import { CONTENT_RAIL_DESIGN_CONFIG } from "@/components/content-rail/config/contentRail.config";
import { ContentRailType } from "@/components/content-rail/config/contentRail.types";
import { mapApiRailItem } from "@/components/content-rail/utils/contentRail.mapper";
import { useFocusable, setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";

// This page keeps re-rendering while the socket-fed watchlist streams in, so
// retrySetFocus (rather than a single setFocus) guards against the same
// norigin setFocus/addFocusable race documented in AssetDetailView.tsx.
function retrySetFocus(focusKey: string, attempts = 8, intervalMs = 100) {
  let tries = 0;
  const attempt = () => {
    tries += 1;
    if (doesFocusableExist(focusKey)) {
      setFocus(focusKey);
    }
    if (tries < attempts) {
      setTimeout(attempt, intervalMs);
    }
  };
  setTimeout(attempt, intervalMs);
}

function FocusableRetryBtn({ onClick }: { onClick: () => void }) {
  const { ref, focused } = useFocusable({ focusKey: "watchlist-retry-btn", onEnterPress: onClick });

  useEffect(() => {
    const timer = setTimeout(() => setFocus("watchlist-retry-btn"), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      ref={ref as any}
      onClick={onClick}
      className={`px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all outline-none ${
        focused ? "ring-2 ring-white scale-105 shadow-2xl" : ""
      }`}
      style={{ background: "var(--theme_13_samecolour, #ff6b00)" }}
    >
      Retry
    </button>
  );
}

// Sits on top of its card's own <a> focusable rather than being reachable only
// on mouse hover (the CSS-only `group-hover:opacity-100` it used to rely on
// never fires for D-pad navigation, so a TV remote could never remove a title
// from the watchlist before this). Reached by pressing Right from a card that
// has no next card in its own row (wired via BaseContentCard's
// onArrowLeftRight prop below) — pressing Up or Left here returns to that card.
function FocusableRemoveBtn({ focusKey, cardFocusKey, onRemove }: { focusKey: string; cardFocusKey: string; onRemove: () => void }) {
  const { ref, focused } = useFocusable({
    focusKey,
    onArrowPress: (direction) => {
      if (direction === "up" || direction === "left") {
        setFocus(cardFocusKey);
        return false;
      }
      return true;
    },
    onEnterPress: onRemove,
  });

  return (
    <button
      ref={ref as any}
      className={`absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-black/60 hover:bg-red-600/80 text-white/80 hover:text-white backdrop-blur-sm outline-none ${
        focused
          ? "opacity-100 ring-2 ring-white bg-red-600/80 text-white scale-110"
          : "opacity-0 group-hover:opacity-100"
      }`}
      title="Remove from watchlist"
      onClick={(e) => {
        e.stopPropagation();
        onRemove();
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}

export default function WatchlistPage() {
  const { isAppReady } = useBootstrap();
  const sessionId = useAuthStore((s) => s.token);

  const assets = useWatchlistStore((s) => s.assets);
  const isLoading = useWatchlistStore((s) => s.isLoading);
  const isError = useWatchlistStore((s) => s.isError);
  const errorMessage = useWatchlistStore((s) => s.errorMessage);
  const currentPage = useWatchlistStore((s) => s.currentPage);
  const totalPages = useWatchlistStore((s) => s.totalPages);
  const hasFetchedInitial = useWatchlistStore((s) => s.hasFetchedInitial);
  const fetchWatchlist = useWatchlistStore((s) => s.fetchWatchlist);
  const toggleWatchlist = useWatchlistStore((s) => s.toggleWatchlist);

  const openAssetDetail = useAssetDetailStore((s) => s.openAssetDetail);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch watchlist on mount (once)
  useEffect(() => {
    if (isAppReady && sessionId && !hasFetchedInitial) {
      fetchWatchlist(1);
    }
  }, [isAppReady, sessionId, hasFetchedInitial, fetchWatchlist]);

  // Infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && currentPage < totalPages) {
          fetchWatchlist(currentPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [isLoading, currentPage, totalPages, fetchWatchlist]);

  const handleRemove = useCallback(
    (assetId: number) => {
      toggleWatchlist(assetId, false);
    },
    [toggleWatchlist]
  );

  const firstCardFocusKey = assets.length > 0
    ? `watchlist-card-${Number(assets[0].asset_id ?? assets[0].assetId)}`
    : null;
  // Read by FocusableNavLink/FocusableSearch/FocusableLoginButton/ProfileDropdown's
  // onArrowPress('down') fallback so pressing Down from the navbar lands here
  // deterministically instead of relying on norigin's default nearest-neighbor
  // search — same convention used on /account-settings.
  const topRowFocusKey = isError ? "watchlist-retry-btn" : firstCardFocusKey;

  // Land the D-pad on the first card (or the Retry button, if the fetch failed)
  // as soon as one exists — this page has no hero/nav content above the grid,
  // so without this a TV user opening it has nothing focused at all.
  useEffect(() => {
    if (topRowFocusKey) {
      retrySetFocus(topRowFocusKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isError, firstCardFocusKey]);

  const handleCardClick = useCallback(
    (assetId: number) => {
      openAssetDetail(String(assetId), "", "");
    },
    [openAssetDetail]
  );

  if (!isAppReady || !sessionId) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--theme_12)" }}
      >
        <Loader size="lg" />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--theme_12)" }}>
      {/* id/data-focuskey read by the navbar's onArrowPress('down') fallback so
          pressing Down from the navbar lands on the topmost real row here
          instead of relying on norigin's default nearest-neighbor search. */}
      <div
        id="page-focus-entry"
        data-focuskey={topRowFocusKey ?? undefined}
        className="w-full px-4 sm:px-6 lg:px-14 pt-28 pb-16"
      >
        {/* Page Header */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-4 sm:mt-6 lg:mt-8 mb-8">
          My Watchlist
        </h1>

        {/* Loading State */}
        {isLoading && assets.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-8 gap-x-4 sm:gap-x-6 lg:gap-x-14">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="w-full aspect-video rounded-lg animate-pulse skeleton"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-white/60 text-base">
              {errorMessage || "Something went wrong while loading your watchlist."}
            </p>
            <FocusableRetryBtn onClick={() => fetchWatchlist(1)} />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && hasFetchedInitial && assets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2" style={{ background: "var(--theme_9, #1e1e1e)" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-white/80 text-lg font-semibold">
              Your watchlist is empty
            </p>
            <p className="text-white/40 text-sm text-center max-w-xs">
              Browse movies and shows to add them to your watchlist for easy access later.
            </p>
          </div>
        )}

        {/* Watchlist Grid */}
        {assets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-8 gap-x-4 sm:gap-x-6 lg:gap-x-14">
            {assets.map((item, idx) => {
              const id = Number(item.asset_id ?? item.assetId);
              const railItem = mapApiRailItem(item, idx);
              const config = CONTENT_RAIL_DESIGN_CONFIG[ContentRailType.LANDSCAPE];
              const cardFocusKey = `watchlist-card-${id}`;
              const removeFocusKey = `watchlist-remove-${id}`;

              return (
                <BaseContentCard
                  key={id}
                  item={railItem}
                  config={config}
                  imageUrl={railItem.landscapeImage || railItem.image}
                  onClick={() => handleCardClick(id)}
                  index={idx}
                  itemsLength={assets.length}
                  fluid
                  className="aspect-video"
                  focusKey={cardFocusKey}
                  // Down used to unconditionally jump to this card's own Delete
                  // button, which blocked normal grid navigation to the row
                  // below on every single card — no onArrowUpDown here now, so
                  // Down falls through to BaseContentCard's own default
                  // nearest-neighbor search and correctly lands on the card
                  // below instead. Delete is reached via Right instead, and
                  // only when there's no next card in the same row to its
                  // right (checked geometrically via getBoundingClientRect,
                  // since the grid's column count varies by breakpoint) —
                  // otherwise Right moves to the next card, same as before.
                  onArrowLeftRight={(direction) => {
                    if (direction === "left") {
                      if (idx > 0) {
                        const prevItem = assets[idx - 1];
                        const prevId = Number(prevItem.asset_id ?? prevItem.assetId);
                        setFocus(`watchlist-card-${prevId}`);
                      }
                      return;
                    }
                    const nextItem = assets[idx + 1];
                    if (nextItem) {
                      const nextId = Number(nextItem.asset_id ?? nextItem.assetId);
                      const nextCardKey = `watchlist-card-${nextId}`;
                      const currentEl = document.querySelector(`[data-focuskey="${cardFocusKey}"]`);
                      const nextEl = document.querySelector(`[data-focuskey="${nextCardKey}"]`);
                      const sameRow =
                        currentEl &&
                        nextEl &&
                        Math.abs(
                          currentEl.getBoundingClientRect().top - nextEl.getBoundingClientRect().top
                        ) < 5;
                      if (sameRow) {
                        setFocus(nextCardKey);
                        return;
                      }
                    }
                    setFocus(removeFocusKey);
                  }}
                >
                  <FocusableRemoveBtn
                    focusKey={removeFocusKey}
                    cardFocusKey={cardFocusKey}
                    onRemove={() => handleRemove(id)}
                  />
                </BaseContentCard>
              );
            })}
          </div>
        )}

        {/* Infinite scroll sentinel + loading more indicator */}
        {currentPage < totalPages && (
          <div ref={sentinelRef} className="flex justify-center py-8">
            {isLoading && <Loader size="md" />}
          </div>
        )}
      </div>
    </main>
  );
}
