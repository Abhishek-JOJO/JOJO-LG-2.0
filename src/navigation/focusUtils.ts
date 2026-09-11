"use client";

import { setFocus, doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
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
export function restorePageFocus() {
  if (typeof window === "undefined") return;

  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (attempts > MAX_ATTEMPTS) {
      clearInterval(interval);
      return;
    }

    // A full-screen modal (search, asset detail) owns its own focus while it's open.
    // If one is currently open, this call must have been triggered by something
    // unrelated to it — e.g. the home page behind it refetching its rails data and
    // re-running its own restorePageFocus() effect — and proceeding would silently
    // steal focus away from the modal's content without any visible cause.
    if (usePlayerStore.getState().isSearchOpen || useAssetDetailStore.getState().isOpen) {
      clearInterval(interval);
      return;
    }

    // 1. Check if an element on screen ALREADY has visual spatial navigation focus.
    // Checked via document.activeElement rather than a focus-ring class name, since
    // the ring styling is a presentation detail that can change independently of
    // which element actually holds focus.
    const activeFocused = document.activeElement?.hasAttribute("data-focuskey")
      ? document.activeElement
      : null;
    if (activeFocused) {
      clearInterval(interval);
      return;
    }

    // 2. Hero carousel, if present on this page — only commit once it's actually
    // registered with the spatial-nav library; otherwise keep retrying.
    if (document.querySelector('[data-focuskey="hero-carousel"]')) {
      if (doesFocusableExist("hero-carousel")) {
        setFocus("hero-carousel");
      }
      return;
    }

    // 3. First focusable card on the main page (excluding modal & navbar nodes)
    const firstCardOnPage = document.querySelector(
      'main [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"]), section [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"])'
    );
    if (firstCardOnPage) {
      const key = firstCardOnPage.getAttribute("data-focuskey");
      if (key && doesFocusableExist(key)) {
        setFocus(key);
      }
      return;
    }

    // 4. Fallback: first navbar link if the page has no cards yet
    const navLink = document.querySelector('[data-focuskey^="nav-link"]');
    if (navLink) {
      const key = navLink.getAttribute("data-focuskey");
      if (key && doesFocusableExist(key)) {
        setFocus(key);
      }
    }
  }, POLL_INTERVAL_MS);
}
