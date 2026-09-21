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
import { PlayerLoadingView } from "@features/player/components/PlayerLoadingView";
import { Loader } from "@components/common/Loader";
import { useToastStore } from "@store/useToastStore";
import { ROUTES } from "@/lib/constants/routes";
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";
import { useAssetDetailStore, getAssetTypeSlug, slugify, schedulePendingAssetDetailOpen } from "@/features/asset/store/useAssetDetailStore";
import { logger } from "@/lib/logger/logger";
import { useWatchPageGating } from "@/features/asset/hooks/useWatchPageGating";
import { safeNavigate } from "@/lib/webos/safeNavigate";
import { mapContentAsset } from "@/features/content/model/mapper";

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
  const { data: video, isError, error } = useVideoDetails(
    id,
    isAppReady,
    isPlaybackFetchEnabled
  );

  const showToast = useToastStore((state) => state.show);


  // Was building a "/<type>/<slug>/<id>" URL and hard-navigating straight to
  // it — that URL has no static file behind it under `output: "export"`
  // (only the SSG placeholder page for that dynamic route actually exists),
  // so the navigation failed and handed control to webOS's native "UNABLE TO
  // LOAD" screen — the reported crash. openAssetDetail's own comment already
  // flags this exact trap for the same reason. The fix mirrors how this
  // codebase already reopens things across a hard reload elsewhere (e.g.
  // Next Episode's play_metadata_* sessionStorage hand-off): schedule which
  // asset to reopen, then navigate to a route that's actually real (home),
  // and let LayoutClientWrapper's mount effect open the modal for real once
  // we land there.
  const handleBack = useCallback(() => {
    // Determine the target asset ID to return to (parent show for episodes, or assetId for movies)
    const parentId = video?.parentId || (rawAsset?.asset_id ? String(rawAsset.asset_id) : null) || (currentAsset?.parent_id ? String(currentAsset.parent_id) : null);
    const returnId = String(parentId ?? video?.contentId ?? rawAsset?.asset_id ?? currentAsset?.asset_id ?? id);
    const returnType = parentId ? "shows" : (rawAsset?.asset_type ?? currentAsset?.asset_type ?? video?.contentType ?? "movies");
    const returnTitle = (
      (parentId ? video?.seriesInfo?.seriesTitle : null) ||
      video?.title ||
      rawAsset?.asset_title ||
      currentAsset?.asset_title ||
      currentAsset?.title ||
      ""
    );

    // Prefer already-cached mapped asset in sessionStorage; fallback to rawAsset or currentAsset
    let assetToCache: any = null;
    try {
      const stored = sessionStorage.getItem(`asset_cache_${returnId}`);
      if (stored) {
        assetToCache = JSON.parse(stored);
      }
    } catch {}

    if (!assetToCache) {
      const candidate = (parentId ? rawAsset : (currentAsset || rawAsset));
      if (candidate) {
        if (!candidate.title && candidate.asset_title) {
          try {
            assetToCache = mapContentAsset({ data: candidate } as any);
          } catch {
            assetToCache = candidate;
          }
        } else {
          assetToCache = candidate;
        }
      }
    }

    // If still missing full metadata, build a rich fallback so the detail page never renders a blank skeleton
    if (!assetToCache) {
      let meta: any = null;
      try {
        const rawMeta = sessionStorage.getItem(`play_metadata_${id}`) || sessionStorage.getItem(`play_metadata_${returnId}`);
        if (rawMeta) meta = JSON.parse(rawMeta);
      } catch {}

      const posterUrl = meta?.landscape || meta?.poster || video?.thumbnailUrl || "";
      assetToCache = {
        assetId: returnId,
        id: returnId,
        title: returnTitle || meta?.title || video?.title || "",
        description: meta?.description || video?.description || "",
        poster: { url: posterUrl },
        landscape: { url: posterUrl },
        heroImage: posterUrl,
        landscapeImage: posterUrl,
        posterImage: posterUrl,
        image: posterUrl,
        thumbnailUrl: posterUrl,
        assetType: returnType === "shows" ? "SHOW" : "MOVIE",
        assetTypeCode: returnType === "shows" ? 2 : 1,
        assetCategoryCode: meta?.assetCategoryCode || 1,
        certification: meta?.certification || "",
        genres: meta?.genres || [],
        seasons: (rawAsset?.seasons as any) || (currentAsset?.seasons as any) || [],
      };
    }

    schedulePendingAssetDetailOpen(returnId, returnType, returnTitle, assetToCache);
    safeNavigate(router, ROUTES.HOME, { replace: true });
  }, [video, rawAsset, currentAsset, id, router]);

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
          safeNavigate(router, ROUTES.SUBSCRIPTION);
        } else {
          safeNavigate(router, ROUTES.HOME);
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
    safeNavigate(router, ROUTES.SUBSCRIPTION);
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
          onClick={() => safeNavigate(router, ROUTES.HOME)}
          className="px-6 py-2 bg-theme_13_samecolour text-theme_1 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Go Home
        </div>
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

  // Show the player's loading presentation immediately. The playback engine
  // still mounts only after authorization and a successful playback response.
  if (gateStatus === "loading" || isError || !video) {
    return (
      <PlayerLoadingView
        title={video?.title || currentAsset?.title || currentAsset?.asset_title}
        onBack={handleBack}
      />
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
            safeNavigate(router, ROUTES.WATCH(targetId));
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
      fallback={<PlayerLoadingView />}
    >
      <WatchContent />
    </Suspense>
  );
}
