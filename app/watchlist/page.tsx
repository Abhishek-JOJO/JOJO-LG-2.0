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
      <div className="w-full px-4 sm:px-6 lg:px-14 pt-28 pb-16">
        {/* Page Header */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-4 sm:mt-6 lg:mt-8 mb-8">
          My Watchlist
        </h1>

        {/* Loading State */}
        {isLoading && assets.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-8 gap-x-4 sm:gap-x-6 lg:gap-x-14">
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
            <button
              onClick={() => fetchWatchlist(1)}
              className="px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all"
              style={{ background: "var(--theme_13_samecolour, #ff6b00)" }}
            >
              Retry
            </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-8 gap-x-4 sm:gap-x-6 lg:gap-x-14">
            {assets.map((item, idx) => {
              const id = Number(item.asset_id ?? item.assetId);
              const railItem = mapApiRailItem(item, idx);
              const config = CONTENT_RAIL_DESIGN_CONFIG[ContentRailType.LANDSCAPE];

              return (
                <BaseContentCard
                  key={id}
                  item={railItem}
                  config={config}
                  imageUrl={railItem.landscapeImage || railItem.image}
                  onClick={() => handleCardClick(id)}
                  index={idx}
                  itemsLength={assets.length}
                  className="!w-full !h-auto aspect-video"
                >
                  {/* Remove button on hover */}
                  <button
                    className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/60 hover:bg-red-600/80 text-white/80 hover:text-white backdrop-blur-sm"
                    title="Remove from watchlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
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
