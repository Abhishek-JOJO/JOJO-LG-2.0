"use client";

import { useEffect, useMemo } from "react";
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
import { useBootstrap } from "@lib/bootstrap/BootstrapContext";

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

const parseCategoryCode = (val: any): number | null => {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") return val;
  const s = String(val).toUpperCase();
  if (s === "AVOD" || s === "1") return 1;
  if (s === "SVOD" || s === "2") return 2;
  if (s === "TVOD" || s === "3") return 3;
  if (s === "FVOD" || s === "4") return 4;
  if (s === "LVOD" || s === "5") return 5;
  return null;
};

export function useWatchPageGating(id: string): WatchPageGateResult {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuthStore();
  const { countryCode } = useGeoAvailability();
  const { isMobile, isReady } = useIsMobile();
  const { isAppReady } = useBootstrap();

  // Read stored play metadata from sessionStorage if available (from detail screen click)
  const storedMeta = useMemo(() => {
    if (typeof window === "undefined" || !id) return null;
    try {
      const raw = sessionStorage.getItem(`play_metadata_${id}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [id]);

  // 1. Verify User Subscription status
  const { data: verifyData, isLoading: isVerifyLoading } = useVerifySubscription(
    countryCode ?? appConfig.GEO_DEFAULT_COUNTRY_CODE,
    token ?? undefined,
    isAppReady
  );

  const isSubscribed =
    storedMeta?.isSvodSubscribed ??
    (isAuthenticated && !user?.isGuest && verifyData?.data?.planType === "SVOD");

  // 2. Fetch raw details of the current asset
  const { data: currentAsset, isLoading: isCurrentAssetLoading } = useQuery({
    queryKey: ["current-asset-gating", id, token],
    queryFn: async () => {
      const response = await getAsset(id, token ?? undefined);
      return response?.data ?? null;
    },
    enabled: !!id && !storedMeta,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 3. Fetch parent asset if it is an episode of a show
  const parentId = (currentAsset as any)?.parent_id || (currentAsset as any)?.parentId || storedMeta?.seriesInfo?.seriesId;
  const { data: rawAsset, isLoading: isRawAssetLoading, isFetching: isRawAssetFetching, isError: isRawAssetError } = useQuery({
    queryKey: ["raw-parent-asset", parentId, token],
    queryFn: async () => {
      const response = await getAsset(parentId!, token ?? undefined);
      return response?.data ?? null;
    },
    enabled: !!parentId && !storedMeta,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 4. Derive asset monetization category (SVOD/TVOD) using multi-source category parser (prioritize storedMeta)
  const categoryCode =
    parseCategoryCode(storedMeta?.assetCategoryCode) ??
    parseCategoryCode(storedMeta?.assetCategory) ??
    parseCategoryCode(currentAsset?.asset_category) ??
    parseCategoryCode((currentAsset as any)?.assetCategoryCode) ??
    parseCategoryCode(rawAsset?.asset_category) ??
    parseCategoryCode((rawAsset as any)?.assetCategoryCode);

  const isTvodAsset = categoryCode === ASSET_CATEGORY_CODE.TVOD;
  const isSvodAsset = categoryCode === ASSET_CATEGORY_CODE.SVOD;

  // 5. Fetch TVOD purchase pricing and verification status
  const { data: pricing, isLoading: isPricingLoading } = useAssetPricing(
    id,
    countryCode ?? appConfig.GEO_DEFAULT_COUNTRY_CODE,
    !!isTvodAsset && isAuthenticated
  );
  const isTvodPurchased = storedMeta?.isTvodPurchased ?? pricing?.isUserPurchased ?? false;

  const isOverseas = countryCode && countryCode !== appConfig.GEO_DEFAULT_COUNTRY_CODE;

  // 6. Evaluate all gating checks synchronously
  const hasTokenInStorage = typeof window !== "undefined" && Boolean(localStorage.getItem("AUTH_TOKEN"));
  const isUserAuthenticated = isAuthenticated || Boolean(token) || hasTokenInStorage;

  const isGateLoading =
    (!storedMeta && isCurrentAssetLoading) ||
    isVerifyLoading ||
    (hasTokenInStorage && (!isAuthenticated || !token)) ||
    (!!parentId && !storedMeta && (isRawAssetLoading || isRawAssetFetching || (!rawAsset && !isRawAssetError))) ||
    (!!isTvodAsset && isPricingLoading) ||
    !isReady ||
    !isAppReady;

  const gateDecision: { status: GateStatus; redirect?: string } = (() => {
    if (!id) {
      // If window.location has ?v= parameter, search params are still hydrating -> status loading
      if (typeof window !== "undefined" && window.location.search.includes("v=")) {
        return { status: "loading" };
      }
      return { status: "blocked", redirect: ROUTES.HOME };
    }

    // Wait while app or viewport readiness is initializing
    if (!isReady || !isAppReady) {
      return { status: "loading" };
    }

    // Gate 1: Check Auth (must have active token or authenticated session)
    if (!isUserAuthenticated) {
      return { status: "blocked", redirect: ROUTES.HOME };
    }

    // Gate 5: Mobile device restriction (only blocks actual playback)
    if (isMobile) {
      return { status: "blocked", redirect: getMobileDownloadAppRoute() };
    }

    // Server-Authoritative Gating:
    // Allow /playback API fetch to execute. The backend /playback API performs
    // exact server-side entitlement check and returns HTTP 200 with signed CDN URL
    // if authorized, or HTTP 403 if subscription/payment is required.
    return { status: "allowed" };
  })();

  // 7. Perform redirect side effects
  useEffect(() => {
    if (gateDecision.status === "blocked" && gateDecision.redirect) {
      if (typeof window !== "undefined" && window.location.search.includes("v=")) {
        logger.info("[useWatchPageGating] Suppressed redirect because URL contains ?v=", { redirect: gateDecision.redirect });
        return;
      }
      logger.info("[useWatchPageGating] Access BLOCKED — Redirecting", { redirect: gateDecision.redirect });
      router.replace(gateDecision.redirect);
    }
  }, [gateDecision.status, gateDecision.redirect, router]);

  // 8. Debug logging
  useEffect(() => {
    if (currentAsset || storedMeta) {
      logger.info("[useWatchPageGating] State updated", {
        asset_id: id,
        categoryCode,
        isSvodAsset,
        isTvodAsset,
        isSubscribed,
        isAuthenticated: isUserAuthenticated,
        gateStatus: gateDecision.status,
      });
    }
  }, [currentAsset, storedMeta, categoryCode, isSvodAsset, isTvodAsset, isSubscribed, isUserAuthenticated, gateDecision.status, id]);

  return {
    gateStatus: gateDecision.status,
    isPlaybackFetchEnabled: gateDecision.status === "allowed",
    currentAsset: currentAsset || storedMeta,
    rawAsset,
    isSvodAsset,
    isTvodAsset,
    isSubscribed,
    isTvodPurchased,
  };
}
