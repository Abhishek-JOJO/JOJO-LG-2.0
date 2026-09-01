"use client";

/**
 * Static watch page — compatible with `output: "export"`.
 *
 * Reads the asset ID from the query string (`?v=<id>`) instead of a
 * dynamic `[id]` segment, so Next.js can export a single static HTML
 * file while the player fetches everything client-side.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useCallback, useState } from "react";
import { useVideoDetails } from "@features/player/hooks/useVideoDetails";
import { OTTPlayer } from "@features/player/components/OTTPlayer";
import { Loader } from "@components/common/Loader";
import { useToastStore } from "@store/useToastStore";
import { ROUTES } from "@/lib/constants/routes";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useAssetDetailStore, getAssetTypeSlug, slugify } from "@/features/asset/store/useAssetDetailStore";
import { logger } from "@/lib/logger/logger";
import { useWatchPageGating } from "@/features/asset/hooks/useWatchPageGating";

function WatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawId = searchParams.get("v");
  const fallbackId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("v") : null;
  const id = rawId || fallbackId || "";

  // 1. Execute watch page security gating (SVOD, TVOD, Overseas, Guests)
  const {
    gateStatus,
    isPlaybackFetchEnabled,
    rawAsset,
    currentAsset,
    isSubscribed,
    isTvodPurchased,
  } = useWatchPageGating(id);

  // 2. Fetch video details for playback engine only when user is authorized
  const { isAppReady } = useBootstrap();
  const { data: video, isLoading: isVideoLoading, isError, error } = useVideoDetails(
    id,
    isAppReady,
    isPlaybackFetchEnabled
  );

  const showToast = useToastStore((state) => state.show);


  const handleBack = useCallback(() => {
    const safeReplace = (url: string) => {
      window.history.replaceState({}, '', url);
      router.replace(url);
    };

    if (video?.parentId && rawAsset) {
      const parentId = String(rawAsset.asset_id ?? video.parentId);
      const title = rawAsset.asset_title ?? "";
      const type = rawAsset.asset_type ?? "shows";

      const typeSlug = getAssetTypeSlug(type);
      const titleSlug = slugify(title);
      const targetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${parentId}` : `/${typeSlug}/${parentId}`;

      safeReplace(targetUrl);
      return;
    }

    if (video?.parentId) {
      const parentId = video.parentId;
      const title = video.seriesInfo?.seriesTitle ?? "";
      const typeSlug = "shows";
      const titleSlug = slugify(title);
      const targetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${parentId}` : `/${typeSlug}/${parentId}`;

      safeReplace(targetUrl);
      return;
    }

    if (video) {
      const contentId = video.contentId;
      const title = video.title ?? "";
      const typeSlug = getAssetTypeSlug(video.contentType);
      const titleSlug = slugify(title);
      const targetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${contentId}` : `/${typeSlug}/${contentId}`;

      safeReplace(targetUrl);
      return;
    }

    router.back();
  }, [video, rawAsset, router]);

  // Automatically reset asset detail modal state on mount
  useEffect(() => {
    try {
      useAssetDetailStore.setState({
        activeAssetId: null,
        activeContentType: null,
        activeTitle: null,
        isOpen: false,
        originalPath: null,
        historyCount: 0,
        shouldScrollToBottom: false,
      });
    } catch (err) {
      logger.warn("[Watch Page] Failed to close asset detail modal", err);
    }
  }, []);

  // Show error toaster and redirect based on server authorization status
  useEffect(() => {
    if (isError && error) {
      const status = (error as any)?.status;
      const errMsg = error instanceof Error ? error.message : "Failed to load playback details";
      showToast(errMsg, "error");

      const timer = setTimeout(() => {
        if (status === 403 || errMsg.toLowerCase().includes("subscription")) {
          router.push(ROUTES.SUBSCRIPTION);
        } else {
          router.push(ROUTES.HOME);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isError, error, showToast, router]);

  const [redirectingToAsset, setRedirectingToAsset] = useState(false);

  const handleGoAdsFree = useCallback(() => {
    let assetUrl = null;

    if (video?.parentId && rawAsset) {
      const parentId = String(rawAsset.asset_id ?? video.parentId);
      const title = rawAsset.asset_title ?? "";
      const type = rawAsset.asset_type ?? "shows";

      const typeSlug = getAssetTypeSlug(type);
      const titleSlug = slugify(title);
      assetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${parentId}` : `/${typeSlug}/${parentId}`;
    } else if (video?.parentId) {
      const parentId = video.parentId;
      const title = video.seriesInfo?.seriesTitle ?? "";
      const typeSlug = "shows";
      const titleSlug = slugify(title);
      assetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${parentId}` : `/${typeSlug}/${parentId}`;
    } else if (video) {
      const contentId = video.contentId;
      const title = video.title ?? "";
      const typeSlug = getAssetTypeSlug(video.contentType);
      const titleSlug = slugify(title);
      assetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${contentId}` : `/${typeSlug}/${contentId}`;
    }

    if (assetUrl) {
      sessionStorage.setItem("redirect_back_to_asset", assetUrl);
    }

    if (video?.contentId) {
      sessionStorage.setItem("return_watch_asset_id", video.contentId.toString());
    }

    // Hide the player IMMEDIATELY before leaving, so that if the user clicks the browser Back button,
    // the restored route cache (bfcache) has the player already hidden!
    setRedirectingToAsset(true);
    router.push(ROUTES.SUBSCRIPTION);
  }, [video, rawAsset, router]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — gate blocks the player from EVER mounting
  // ═══════════════════════════════════════════════════════════════════════════



  if (redirectingToAsset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader />
      </div>
    );
  }

  // No ID provided
  if (!id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6 text-center">
        <div className="text-5xl mb-4">🎬</div>
        <h2 className="text-xl font-semibold text-theme_1 mb-2">
          No Content Selected
        </h2>
        <p className="text-sm text-theme_1/60 mb-6 max-w-sm">
          Please select something to watch from the home page.
        </p>
        <div
          onClick={() => router.push(ROUTES.HOME)}
          className="px-6 py-2 bg-theme_13_samecolour text-theme_1 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go Home
        </div>
      </div>
    );
  }

  // GATE: Still loading checks — show loader, NEVER the player
  if (gateStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader />
      </div>
    );
  }

  // GATE: Blocked — show loader while redirect fires
  if (gateStatus === "blocked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader />
      </div>
    );
  }

  // GATE: Still waiting for video data after passing the gate
  if (isError || !video) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader />
      </div>
    );
  }



  const showAsset = (rawAsset?.seasons && rawAsset.seasons.length > 0)
    ? rawAsset
    : (currentAsset?.seasons && currentAsset.seasons.length > 0)
      ? currentAsset
      : null;

  const seasonsData = showAsset?.seasons || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // ALLOWED — render the player
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="w-full">
        <OTTPlayer
          video={video}
          seasons={seasonsData as any}
          currentEpisodeId={video?.contentId ? Number(video.contentId) : null}
          onBack={handleBack}
          onGoAdsFree={handleGoAdsFree}
          onEpisodeSelect={(episode) => {
            const targetId = String(episode.asset_id ?? (episode as any).assetId ?? "");
            if (!targetId) {
              logger.error("[Watch Page] Cannot navigate: episode targetId is empty", { episode });
              return;
            }

            if (showAsset) {
              const showAssetAny = showAsset as any;
              const seasons = showAssetAny.seasons || [];
              let foundEpisode: any = null;
              let foundSeason: any = null;

              for (const s of seasons) {
                const eps = s.episodes || [];
                const found = eps.find((e: any) => {
                  const eId = String(e.asset_id ?? e.assetId ?? "");
                  return eId === targetId;
                });
                if (found) {
                  foundEpisode = found;
                  foundSeason = s;
                  break;
                }
              }

              if (foundEpisode && foundSeason) {
                const seasonNum = Number(foundSeason.season_number ?? foundSeason.seasonNumber ?? 1);
                const epNum = Number(foundEpisode.episode_number ?? foundEpisode.episodeNumber ?? 1);

                sessionStorage.setItem(
                  `play_metadata_${targetId}`,
                  JSON.stringify({
                    title: foundEpisode.asset_title ?? foundEpisode.title,
                    description: foundEpisode.asset_description ?? foundEpisode.description,
                    seriesInfo: {
                      seriesId: String(showAssetAny.asset_id ?? showAssetAny.assetId),
                      seriesTitle: showAssetAny.asset_title ?? showAssetAny.title,
                      seasonNumber: seasonNum,
                      episodeNumber: epNum,
                      nextEpisode: null,
                    },
                    certification: showAssetAny.asset_certification ?? null,
                    classifications: showAssetAny.asset_classifications ?? null,
                    isSvodSubscribed: isSubscribed,
                    isTvodPurchased: isTvodPurchased,
                    assetCategoryCode: foundEpisode.asset_category ?? 1,
                    assetCategory: foundEpisode.asset_category === 2 ? 'svod' : foundEpisode.asset_category === 3 ? 'tvod' : 'avod',
                    assetTypeName: 'episode',
                  })
                );
              }
            }
            router.replace(ROUTES.WATCH(targetId));
          }}
        />
      </div>
    </div>
  );
}

/**
 * Wrap in Suspense because useSearchParams() requires it
 * in Next.js App Router with static export.
 */
export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <Loader />
        </div>
      }
    >
      <WatchContent />
    </Suspense>
  );
}