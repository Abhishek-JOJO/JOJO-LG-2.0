"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@store/useAuthStore";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { useGeoAvailability } from "@/features/geo/hooks/useGeoAvailability";
import { useAssetPricing } from "@/features/content/hooks/useAssetPricing";
import { getAsset } from "@features/content/api/getAsset";
import { appConfig } from "@/lib/config/app.config";
import { ASSET_CATEGORY_CODE } from "@/features/content/model/types";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";

import { useIsMobile } from "@/hooks/useIsMobile";
import { getMobileDownloadAppRoute } from "@/lib/mobile/mobileAccess";

export type GateStatus = "loading" | "blocked" | "allowed";

export interface WatchPageGateResult {
  gateStatus: GateStatus;
  isPlaybackFetchEnabled: boolean;
  currentAsset: any;
  rawAsset: any;
  isSvodAsset: boolean;
  isTvodAsset: boolean;
  isSubscribed: boolean;
  isTvodPurchased: boolean;
}

export function useWatchPageGating(id: string): WatchPageGateResult {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuthStore();
  const { countryCode } = useGeoAvailability();
  const { isMobile, isReady } = useIsMobile();

  // 1. Verify User Subscription status
  const { data: verifyData, isLoading: isVerifyLoading } = useVerifySubscription(
    countryCode ?? appConfig.GEO_DEFAULT_COUNTRY_CODE,
    token ?? undefined,
    true
  );

  const isSubscribed = isAuthenticated && !user?.isGuest && verifyData?.data?.planType === "SVOD";

  // 2. Fetch raw details of the current asset
  const { data: currentAsset, isLoading: isCurrentAssetLoading } = useQuery({
    queryKey: ["raw-asset", id, token],
    queryFn: async () => {
      const response = await getAsset(id, token ?? undefined);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 3. Fetch parent asset if it is an episode of a show
  const parentId = (currentAsset as any)?.parent_id || (currentAsset as any)?.parentId;
  const { data: rawAsset, isLoading: isRawAssetLoading } = useQuery({
    queryKey: ["raw-parent-asset", parentId, token],
    queryFn: async () => {
      const response = await getAsset(parentId!, token ?? undefined);
      return response.data;
    },
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 4. Derive asset monetization category (SVOD/TVOD)
  const isTvodAsset =
    currentAsset?.asset_category === ASSET_CATEGORY_CODE.TVOD || (currentAsset as any)?.assetCategoryCode === ASSET_CATEGORY_CODE.TVOD ||
    rawAsset?.asset_category === ASSET_CATEGORY_CODE.TVOD || (rawAsset as any)?.assetCategoryCode === ASSET_CATEGORY_CODE.TVOD;

  const isSvodAsset =
    currentAsset?.asset_category === ASSET_CATEGORY_CODE.SVOD || (currentAsset as any)?.assetCategoryCode === ASSET_CATEGORY_CODE.SVOD ||
    rawAsset?.asset_category === ASSET_CATEGORY_CODE.SVOD || (rawAsset as any)?.assetCategoryCode === ASSET_CATEGORY_CODE.SVOD;

  // 5. Fetch TVOD purchase pricing and verification status
  const { data: pricing, isLoading: isPricingLoading } = useAssetPricing(
    parentId ?? id,
    countryCode ?? appConfig.GEO_DEFAULT_COUNTRY_CODE,
    !!isTvodAsset && isAuthenticated
  );
  const isTvodPurchased = pricing?.isUserPurchased ?? false;

  const isOverseas = countryCode && countryCode !== appConfig.GEO_DEFAULT_COUNTRY_CODE;

  // 6. Evaluate all gating checks synchronously
  const isGateLoading =
    isCurrentAssetLoading ||
    isVerifyLoading ||
    (!!parentId && isRawAssetLoading) ||
    (!!isTvodAsset && isPricingLoading) ||
    !isReady;

  const gateDecision: { status: GateStatus; redirect?: string } = (() => {
    if (!id) return { status: "blocked", redirect: ROUTES.HOME };
    if (isGateLoading || !currentAsset) return { status: "loading" };

    // Safety Check: If parentId is present but we failed to load parent details, block access
    if (parentId && !rawAsset) {
      logger.error("[useWatchPageGating] Failed to load parent asset metadata");
      return { status: "blocked", redirect: ROUTES.HOME };
    }

    // Gate 1: Check Auth
    if (!isAuthenticated || user?.isGuest) {
      return { status: "blocked", redirect: ROUTES.HOME };
    }

    // Gate 2: Overseas restrictions (for non-TVOD content)
    if (isOverseas && !isSubscribed && !isTvodAsset) {
      return { status: "blocked", redirect: ROUTES.SUBSCRIPTION };
    }

    // Gate 3: SVOD restriction
    if (isSvodAsset && !isSubscribed) {
      return { status: "blocked", redirect: ROUTES.SUBSCRIPTION };
    }

    // Gate 4: TVOD restriction
    if (isTvodAsset && !isTvodPurchased) {
      return { status: "blocked", redirect: `/payment?assetId=${id}` };
    }

    // Gate 5: Mobile device restriction (only blocks actual playback)
    if (isMobile) {
      return { status: "blocked", redirect: getMobileDownloadAppRoute() };
    }

    return { status: "allowed" };
  })();

  // 7. Perform redirect side effects
  useEffect(() => {
    if (gateDecision.status === "blocked" && gateDecision.redirect) {
      logger.info("[useWatchPageGating] Access BLOCKED — Redirecting", { redirect: gateDecision.redirect });
      router.replace(gateDecision.redirect);
    }
  }, [gateDecision.status, gateDecision.redirect, router]);

  // 8. Debug logging
  useEffect(() => {
    if (currentAsset) {
      logger.info("[useWatchPageGating] State updated", {
        asset_id: id,
        asset_category: currentAsset.asset_category,
        isSvodAsset,
        isTvodAsset,
        isSubscribed,
        isAuthenticated,
        gateStatus: gateDecision.status,
      });
    }
  }, [currentAsset, isSvodAsset, isTvodAsset, isSubscribed, isAuthenticated, gateDecision.status, id]);

  return {
    gateStatus: gateDecision.status,
    isPlaybackFetchEnabled: gateDecision.status === "allowed",
    currentAsset,
    rawAsset,
    isSvodAsset,
    isTvodAsset,
    isSubscribed,
    isTvodPurchased,
  };
}
