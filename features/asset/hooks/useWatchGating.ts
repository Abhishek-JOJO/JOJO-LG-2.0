"use client";

/**
 * useWatchGating
 *
 * Orchestrates the full entitlement gate chain for "Watch Now" playback.
 * Mirrors the priority hierarchy from asset-click.md Section 11:
 *
 *  Priority 0 — Mobile device check (block web playback on mobile viewports)
 *  Priority 1 — Guest / unauthenticated user check
 *  Priority 2 — Overseas user gating (non-IN users behind subscription wall)
 *  Priority 3 — SVOD subscription gate
 *  Priority 4 — TVOD purchase gate
 *
 * Returns a `checkGate` function and the current gate result state.
 */

import { useCallback, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@store/useAuthStore";
import { useGeoAvailability } from "@/features/geo/hooks/useGeoAvailability";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { useAssetPricing } from "@/features/content/hooks/useAssetPricing";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ROUTES } from "@/lib/constants/routes";
import { ASSET_CATEGORY_CODE } from "@/features/content/model/types";
import type { ContentAsset } from "@/features/content/model/types";
import { logger } from "@/lib/logger/logger";
import { appConfig } from "@/lib/config/app.config";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";
import { useGuestPopupStore } from "@/store/useGuestPopupStore";
import { transformTVODToPaymentPlan } from "@/lib/utils/tvodPaymentTransformer";

// ── Gate result types ──────────────────────────────────────────────────────────

export type WatchGateReason =
  | "none"
  | "mobile"
  | "auth"
  | "subscription"
  | "tvod";

export interface WatchGateResult {
  gate: WatchGateReason;
  /** Human-readable message for the UI toast/popup */
  message: string;
}


// ── Hook ───────────────────────────────────────────────────────────────────────

interface UseWatchGatingOptions {
  asset: ContentAsset | null | undefined;
  enabled?: boolean;
  batchPricing?: any;
  disableIndividualPricing?: boolean;
}

interface UseWatchGatingReturn {
  /** Run the full gate check for the given assetId. Navigates to watch if all gates pass. */
  handleWatch: (targetAssetId: string, resumeTime?: number) => void;
  /** Current active gate result (null if no check has been performed) */
  gateResult: WatchGateResult | null;
  /** Clear the gate result (e.g. after closing a popup) */
  clearGate: () => void;
  /** Whether the TVOD pricing query is loading */
  isPricingLoading: boolean;
  /** Subscription status derived from auth */
  isSubscribed: boolean;
  /** Whether user is overseas */
  isOverseas: boolean;
  /** Whether the user has purchased the TVOD asset */
  isTvodPurchased: boolean;
  /** The pricing data for the asset (useful for TVOD displays) */
  pricing: unknown;
  /** Whether the subscription verification API is loading */
  isVerifyLoading: boolean;
}

export function useWatchGating({
  asset,
  enabled = true,
  batchPricing,
  disableIndividualPricing = false,
}: UseWatchGatingOptions): UseWatchGatingReturn {
  const router = useRouter();
  const [gateResult, setGateResult] = useState<WatchGateResult | null>(null);

  // ── Auth state ─────────────────────────────────────────────────────────────
  const { isAuthenticated, user, token } = useAuthStore();
  const isGuest = user?.isGuest ?? false;

  // ── Geo state ──────────────────────────────────────────────────────────────
  const { countryCode } = useGeoAvailability();
  const isOverseas = useMemo(() => {
    if (!countryCode) return false; // Default to India behavior when unknown
    return countryCode !== appConfig.GEO_DEFAULT_COUNTRY_CODE;
  }, [countryCode]);

  // ── Mobile detection ───────────────────────────────────────────────────────
  const { isMobile } = useIsMobile();

  // ── Subscription status ────────────────────────────────────────────────────
  const { data: verifyData, isLoading: isVerifyLoading } = useVerifySubscription(
    countryCode ?? appConfig.GEO_DEFAULT_COUNTRY_CODE,
    token ?? undefined,
    enabled
  );

  const isSubscribed = useMemo(() => {
    if (!isAuthenticated || isGuest) return false;
    return verifyData?.data?.planType === "SVOD";
  }, [isAuthenticated, isGuest, verifyData]);

  // ── TVOD pricing ───────────────────────────────────────────────────────────
  const isTvodAsset =
    asset?.assetCategoryCode === ASSET_CATEGORY_CODE.TVOD;

  // Disable individual pricing fetch if batchPricing is already provided or disableIndividualPricing is set
  const { data: pricingData, isLoading: isPricingLoading } = useAssetPricing(
    asset?.assetId ?? "",
    countryCode ?? appConfig.GEO_DEFAULT_COUNTRY_CODE,
    isTvodAsset && isAuthenticated && enabled && !disableIndividualPricing && !batchPricing
  );

  const pricing = batchPricing ?? pricingData;

  const isTvodPurchased = pricing?.isUserPurchased ?? false;

  // ── Gate check chain ───────────────────────────────────────────────────────
  const handleWatch = useCallback(
    (targetAssetId: string, resumeTime: number = 0) => {
      logger.info("[useWatchGating] Starting gate check", {
        targetAssetId,
        isMobile,
        isAuthenticated,
        isGuest,
        isOverseas,
        isSubscribed,
        isTvodAsset,
        isTvodPurchased,
      });

      // Priority 1: Auth gate — must be logged in and cannot be a guest.
      if (!isAuthenticated || isGuest) {
        logger.info("[useWatchGating] Gate: auth (guest or unauthenticated)");
        useGuestPopupStore.getState().openGuestPopup();
        return;
      }

      // Priority 2: Overseas gating — non-IN users must be subscribed (except for TVOD assets)
      if (isOverseas && !isSubscribed && !isTvodAsset) {
        useAssetDetailStore.getState().resetAssetDetailModal();
        router.push(ROUTES.SUBSCRIPTION);
        return;
      }

      // Priority 3: SVOD subscription gate
      if (
        asset?.assetCategoryCode === ASSET_CATEGORY_CODE.SVOD &&
        !isSubscribed
      ) {
        useAssetDetailStore.getState().resetAssetDetailModal();
        router.push(ROUTES.SUBSCRIPTION);
        return;
      }

      // Priority 4: TVOD purchase gate
      if (isTvodAsset && !isTvodPurchased) {
        logger.info("[useWatchGating] Gate: tvod -> directly navigating to payment");
        const tvodPlan = transformTVODToPaymentPlan(pricing, asset);
        if (tvodPlan) {
          sessionStorage.setItem("selected_payment_plan", JSON.stringify(tvodPlan));
          useAssetDetailStore.getState().resetAssetDetailModal();
          router.push(`/payment?assetId=${asset?.assetId}`);
        }
        return;
      }

      // Priority 5: Mobile device restriction (only blocks actual playback, not subscription/payment)
      if (isMobile) {
        logger.info("[useWatchGating] Gate: mobile (blocked playback)");
        setGateResult({
          gate: "mobile",
          message:
            "Playback is not available on mobile browsers. Please download the JOJO app.",
        });
        return;
      }

      // ── Save playing asset metadata in sessionStorage for the watch page ──
      try {
        if (asset) {
          let playTitle = asset.title;
          let playDescription = asset.description;
          let seriesInfo = null;

          // If target is an episode, find it in the seasons list
          if (targetAssetId !== asset.assetId) {
            const foundEpisode = asset.seasons
              ?.flatMap((s) => s.episodes)
              .find((e) => e.assetId === targetAssetId);

            if (foundEpisode) {
              playTitle = foundEpisode.title;
              playDescription = foundEpisode.description;

              const foundSeason = asset.seasons.find((s) =>
                s.episodes.some((e) => e.assetId === targetAssetId)
              );

              seriesInfo = {
                seriesId: asset.assetId,
                seriesTitle: asset.title,
                seasonNumber: foundSeason ? foundSeason.seasonNumber : 1,
                episodeNumber: foundEpisode.episodeNumber,
                nextEpisode: null,
              };
            }
          }

          const newMeta = {
            title: playTitle,
            description: playDescription,
            seriesInfo,
            certification: asset.certification,
            classifications: asset.classifications,
            assetCategoryCode: asset.assetCategoryCode,
            assetCategory: asset.assetCategoryCode === 2 ? 'svod' : asset.assetCategoryCode === 3 ? 'tvod' : 'avod',
            assetCertificate: asset.certification || null,
            inTop10: Boolean((asset as any).isintop10 || (asset as any).is_top_10),
            seasonId: seriesInfo?.seriesId || null,
            numberInTop10: (asset as any).numberintop10 !== undefined && (asset as any).numberintop10 !== null ? Number((asset as any).numberintop10) : null,
            assetTypeName: asset.assetTypeCode === 5 ? 'episode' : asset.assetTypeCode === 2 ? 'show' : 'movie',
            isTvodPurchased,
            isSvodSubscribed: isSubscribed,
            resumeTime,
            bypassResumePrompt: resumeTime > 0,
          };

          const existingRaw = sessionStorage.getItem(`play_metadata_${targetAssetId}`);
          let finalMeta = newMeta;
          
          if (existingRaw) {
            try {
              const existing = JSON.parse(existingRaw);
              finalMeta = {
                ...existing,
                ...newMeta,
              };
              // Restore existing fields if newMeta provided undefined
              (Object.keys(newMeta) as (keyof typeof newMeta)[]).forEach((key) => {
                if (newMeta[key] === undefined && existing[key] !== undefined) {
                  // @ts-ignore
                  finalMeta[key] = existing[key];
                }
              });
            } catch (e) {
              // ignore parse errors
            }
          }

          sessionStorage.setItem(
            `play_metadata_${targetAssetId}`,
            JSON.stringify(finalMeta)
          );
        }
      } catch (err) {
        logger.warn("[useWatchGating] Failed to store play metadata in sessionStorage", err);
      }

      // ── All gates passed — navigate to watch page ────────────────────────
      logger.info("[useWatchGating] All gates passed, navigating to watch", {
        targetAssetId,
      });
      setGateResult({ gate: "none", message: "" });
      // Instead of resetting the modal immediately, we only call router.push.
      // The AssetDetailModal will detect the pathname change and automatically call resetAssetDetailModal.
      // This prevents the underlying layout from flashing (showing the background page) while
      // the watch page is fetching data during client-side navigation.
      router.push(ROUTES.WATCH(targetAssetId));
    },
    [
      isMobile,
      isAuthenticated,
      isGuest,
      isOverseas,
      isSubscribed,
      isTvodAsset,
      isTvodPurchased,
      pricing,
      asset,
      router,
    ]
  );

  const clearGate = useCallback(() => {
    setGateResult(null);
  }, []);

  return {
    handleWatch,
    gateResult,
    clearGate,
    isPricingLoading,
    isSubscribed,
    isOverseas,
    isTvodPurchased,
    pricing,
    isVerifyLoading,
  };
}