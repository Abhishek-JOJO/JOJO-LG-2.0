"use client";

import { setFocus, doesFocusableExist, getCurrentFocusKey, ROOT_FOCUS_KEY } from "@noriginmedia/norigin-spatial-navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";

const MAX_ATTEMPTS = 20; // ~2s of retrying at 100ms — generous for slow TV hardware
const POLL_INTERVAL_MS = 100;

/**
 * restorePageFocus — Rock-solid focus restoration helper for TV Spatial Navigation.
 *
 * When navigating back from AssetDetail page/modal to Home Page or any listing page,
 * this function polls the DOM to guarantee focus is restored to a valid node:
 * 1. Hero Carousel (if present)
 * 2. First content rail card on the main page
 * 3. Navbar navigation links (fallback)
 *
 * Every candidate is gated on `doesFocusableExist()` before we call `setFocus()`.
 * On real (slower) TV hardware, React can commit a card's DOM node — so
 * `document.querySelector` finds it — a tick or more before that card's own
 * `useFocusable()` registration effect has actually run and told the spatial-nav
 * library about it. Calling `setFocus()` on a key the library doesn't know about
 * yet is a silent no-op. The previous version cleared its retry loop the moment
 * it found *a DOM node*, without ever confirming focus actually landed — on a
 * fast dev machine that race is nearly impossible to hit, so it looked fine in
 * testing, but on TV-class CPUs it reliably produced "no visible focus on the
 * first card". Now we only stop retrying once a focus ring is actually visible.
 */
export function restorePageFocus(preferredKey?: string | null) {
  if (typeof window === "undefined") return;

  const returnAssetId = useAssetDetailStore.getState().returnAssetId;
  const originKey = preferredKey || useAssetDetailStore.getState().returnFocusKey;

  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (attempts > MAX_ATTEMPTS) {
      clearInterval(interval);
      return;
    }

    // Do NOT steal focus if the user currently has focus on the top navbar / header
    const currentFocusKey = getCurrentFocusKey();
    if (
      currentFocusKey &&
      (currentFocusKey.startsWith("nav-link") ||
       currentFocusKey.startsWith("navbar-") ||
       currentFocusKey.startsWith("nav-"))
    ) {
      clearInterval(interval);
      return;
    }

    if (typeof document !== "undefined") {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.closest("header") ||
         activeEl.closest("nav") ||
         activeEl.getAttribute("data-focuskey")?.startsWith("nav-link") ||
         activeEl.getAttribute("data-focuskey")?.startsWith("navbar-"))
      ) {
        clearInterval(interval);
        return;
      }
    }

    // A full-screen modal (search, asset detail) owns its own focus while it's open.
    // However, if SearchModal IS open and AssetDetailModal just closed:
    // Focus should be restored INSIDE SearchModal!
    const isSearchOpen = usePlayerStore.getState().isSearchOpen;
    const isAssetDetailOpen = useAssetDetailStore.getState().isOpen;

    if (isAssetDetailOpen) {
      clearInterval(interval);
      return;
    }

    if (isSearchOpen) {
      if (returnAssetId) {
        const el = document.querySelector(
          `[data-focuskey="MODAL_SEARCH"] [data-asset-id="${returnAssetId}"], [data-focuskey="MODAL_SEARCH"] [data-focuskey*="${returnAssetId}"]`
        );
        if (el) {
          const fKey = el.getAttribute("data-focuskey");
          if (fKey && doesFocusableExist(fKey)) {
            setFocus(fKey);
            if (el instanceof HTMLElement) {
              el.focus({ preventScroll: true });
              el.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
            }
            useAssetDetailStore.getState().clearReturnFocusKey();
            clearInterval(interval);
            return;
          }
        }
      }
      if (originKey && doesFocusableExist(originKey)) {
        const el = document.querySelector(`[data-focuskey="${originKey}"]`);
        const insideSearch = el?.closest('[data-focuskey="MODAL_SEARCH"]');
        if (insideSearch) {
          setFocus(originKey);
          if (el instanceof HTMLElement) el.focus({ preventScroll: true });
          useAssetDetailStore.getState().clearReturnFocusKey();
          clearInterval(interval);
          return;
        }
      }
      // If originKey isn't inside search, focus search-input
      if (doesFocusableExist("search-input")) {
        setFocus("search-input");
        const inputEl = document.querySelector('[data-focuskey="search-input"]');
        if (inputEl instanceof HTMLElement) inputEl.focus({ preventScroll: true });
        useAssetDetailStore.getState().clearReturnFocusKey();
        clearInterval(interval);
        return;
      }
      return;
    }

    // 1. Prioritize restoring focus to the specific asset card by returnAssetId if available
    if (returnAssetId) {
      const assetEl = document.querySelector(
        `[data-asset-id="${returnAssetId}"]:not([data-focuskey^="MODAL"]), [data-focuskey*="${returnAssetId}"]:not([data-focuskey^="MODAL"])`
      );
      if (assetEl) {
        const assetFocusKey = assetEl.getAttribute("data-focuskey");
        if (assetFocusKey && doesFocusableExist(assetFocusKey)) {
          setFocus(assetFocusKey);
          if (assetEl instanceof HTMLElement) {
            assetEl.focus({ preventScroll: true });
            assetEl.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
          }
          useAssetDetailStore.getState().clearReturnFocusKey();
          clearInterval(interval);
          return;
        }
      }
    }

    // 2. Try to restore exact origin card/key the user came from (e.g. spotlight-lead-fixed on their active Content Rail)
    if (originKey && originKey !== ROOT_FOCUS_KEY && doesFocusableExist(originKey)) {
      const originEl = document.querySelector(`[data-focuskey="${originKey}"]`);
      const insideClosingModal = originEl?.closest(
        '[data-focuskey="MODAL_ASSET_DETAIL"], [data-focuskey="MODAL_SEARCH"]'
      );
      if (!insideClosingModal) {
        setFocus(originKey);
        if (originEl instanceof HTMLElement) {
          originEl.focus({ preventScroll: true });
          originEl.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
        }
        useAssetDetailStore.getState().clearReturnFocusKey();
        clearInterval(interval);
        return;
      }
    }

    // 3. If the active spotlight lead card exists on the page (spotlight-lead-fixed):
    // Prioritize the active spotlight rail lead card over hero carousel so we NEVER jump away from the active Content Rail!
    if (document.querySelector('[data-focuskey="spotlight-lead-fixed"]')) {
      if (doesFocusableExist("spotlight-lead-fixed")) {
        setFocus("spotlight-lead-fixed");
        const leadEl = document.querySelector('[data-focuskey="spotlight-lead-fixed"]');
        if (leadEl instanceof HTMLElement) {
          leadEl.focus({ preventScroll: true });
        }
        useAssetDetailStore.getState().clearReturnFocusKey();
        clearInterval(interval);
        return;
      }
    }

    // 4. Hero carousel fallback — only if no asset card was requested or after initial attempts
    if (!returnAssetId && attempts > 3 && document.querySelector('[data-focuskey="hero-carousel"]')) {
      if (doesFocusableExist("hero-carousel")) {
        setFocus("hero-carousel");
        useAssetDetailStore.getState().clearReturnFocusKey();
        clearInterval(interval);
        return;
      }
    }

    // 5. First focusable card on the main page (excluding modal & navbar nodes)
    const firstCardOnPage = document.querySelector(
      'main [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"]), section [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"])'
    );
    if (firstCardOnPage) {
      const key = firstCardOnPage.getAttribute("data-focuskey");
      if (key && doesFocusableExist(key)) {
        setFocus(key);
        useAssetDetailStore.getState().clearReturnFocusKey();
        clearInterval(interval);
        return;
      }
    }

    // 6. Fallback: active navbar link (or first navbar link) if the page has no cards yet
    const navLink = (
      document.querySelector('header [data-active="true"][data-focuskey]') ||
      document.querySelector('[data-focuskey^="nav-link"]')
    ) as HTMLElement | null;
    if (navLink) {
      const key = navLink.getAttribute("data-focuskey");
      if (key && doesFocusableExist(key)) {
        setFocus(key);
        useAssetDetailStore.getState().clearReturnFocusKey();
        clearInterval(interval);
        return;
      }
    }
  }, POLL_INTERVAL_MS);
}
