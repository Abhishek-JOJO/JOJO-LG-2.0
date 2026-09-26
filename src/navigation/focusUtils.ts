"use client";

import { setFocus, doesFocusableExist, getCurrentFocusKey, ROOT_FOCUS_KEY } from "@noriginmedia/norigin-spatial-navigation";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useAssetDetailStore } from "@/features/asset/store/useAssetDetailStore";

import { useExitConfirmStore } from "@/store/useExitConfirmStore";
import { useActiveRailStore } from "@/store/useActiveRailStore";

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

    const savedScrollY =
      useAssetDetailStore.getState().returnScrollY ??
      ((typeof window !== "undefined" && (window as any)?.__returnScrollY) ?? null);

    const scrollToSectionIfNeeded = (el: HTMLElement) => {
      const currentSection = el.closest("section");
      if (currentSection) {
        const sIndex = currentSection.getAttribute("data-section-index");
        if (sIndex && Number(sIndex) > 0) {
          const rect = currentSection.getBoundingClientRect();
          const targetTop = Math.max(0, (window.scrollY || window.pageYOffset) + rect.top - 105);
          window.scrollTo({ top: targetTop, behavior: "auto" });
          return;
        }
      }
      if (typeof savedScrollY === "number" && savedScrollY > 0) {
        window.scrollTo({ top: savedScrollY, behavior: "auto" });
      }
    };

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
            scrollToSectionIfNeeded(assetEl);
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
          scrollToSectionIfNeeded(originEl);
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
          scrollToSectionIfNeeded(leadEl);
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

/**
 * Synchronizes spatial navigation focus to the best candidate element currently
 * visible in the TV viewport.
 *
 * This prevents spatial navigation from pulling the page back to an off-screen
 * element when the user scrolls with a Magic Remote wheel, LG ThinQ mobile remote slider,
 * or Page Up / Page Down / Channel Up / Channel Down keys.
 */
export function syncFocusToViewport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  // 1. If an overlay or modal is active, keep focus inside or sync within that modal
  const isSearchOpen = usePlayerStore.getState().isSearchOpen;
  const isAssetDetailOpen = useAssetDetailStore.getState().isOpen;
  const isExitConfirmOpen = useExitConfirmStore.getState().isOpen;

  if (isAssetDetailOpen) {
    const modalContainer = document.querySelector('[data-focuskey="MODAL_ASSET_DETAIL"]');
    if (modalContainer instanceof HTMLElement) {
      return syncFocusWithinContainer(modalContainer);
    }
    return false;
  }

  if (isSearchOpen) {
    const searchContainer = document.querySelector('[data-focuskey="MODAL_SEARCH"]');
    if (searchContainer instanceof HTMLElement) {
      return syncFocusWithinContainer(searchContainer);
    }
    return false;
  }

  if (isExitConfirmOpen) return false;

  // 2. Check if current focused element is already comfortably visible in the viewport
  const currentKey = getCurrentFocusKey();
  if (currentKey) {
    const isNavFocused = Boolean(
      currentKey.startsWith("nav-link") ||
      currentKey.startsWith("navbar-") ||
      currentKey.startsWith("nav-") ||
      currentKey === "profile-dropdown-boundary" ||
      (typeof document !== "undefined" && document.activeElement && (
        document.activeElement.closest("header") ||
        document.activeElement.closest("nav")
      ))
    );
    if (isNavFocused) {
      return true; // Keep focus on navbar
    }

    const currentEl = document.querySelector(`[data-focuskey="${currentKey}"]`);
    if (currentEl instanceof HTMLElement && isElementComfortablyVisible(currentEl)) {
      // Current element is already visible, keep it focused
      return true;
    }
  }

  // 3. If near the very top of the page (scrollY <= 60), check for Hero Carousel or top content
  if (window.scrollY <= 60) {
    if (doesFocusableExist("hero-carousel")) {
      setFocus("hero-carousel");
      return true;
    }
    const firstTopCard = document.querySelector<HTMLElement>(
      'main [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"])'
    );
    const fKey = firstTopCard?.getAttribute("data-focuskey");
    if (fKey && doesFocusableExist(fKey)) {
      setFocus(fKey);
      return true;
    }
  }

  // 4. Find all candidate focusables on the active page
  const candidates = document.querySelectorAll<HTMLElement>(
    'main [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"]), section [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"]), [data-focuskey*="card"], [data-focuskey*="rail"]'
  );

  const idealTargetY = window.innerHeight * 0.38; // Focal comfort center on TV
  let bestKey: string | null = null;
  let bestScore = Infinity;

  candidates.forEach((el) => {
    const key = el.getAttribute("data-focuskey");
    if (!key || !doesFocusableExist(key)) return;

    const rect = el.getBoundingClientRect();
    // Must be horizontally visible
    if (rect.right <= 30 || rect.left >= window.innerWidth - 30) return;
    // Must be vertically visible below header (~80px) and above viewport bottom
    if (rect.bottom <= 85 || rect.top >= window.innerHeight - 35) return;
    if (rect.width < 25 || rect.height < 25) return;

    // Center of this card
    const centerY = rect.top + rect.height / 2;
    let score = Math.abs(centerY - idealTargetY);

    // Prefer actual content cards / items over container wrappers
    const isAssetCard = el.hasAttribute("data-asset-id") || key.includes("card") || key.includes("item");
    if (isAssetCard) {
      score -= 60;
    }

    if (score < bestScore) {
      bestScore = score;
      bestKey = key;
    }
  });

  if (bestKey && doesFocusableExist(bestKey)) {
    setFocus(bestKey);
    const targetEl = document.querySelector<HTMLElement>(`[data-focuskey="${bestKey}"]`);
    if (targetEl) {
      targetEl.focus({ preventScroll: true });
    }
    return true;
  }

  return false;
}

function isElementComfortablyVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const topThreshold = 80; // Below sticky header
  const bottomThreshold = window.innerHeight - 40;
  return (
    rect.top >= topThreshold &&
    rect.bottom <= bottomThreshold &&
    rect.left < window.innerWidth - 20 &&
    rect.right > 20 &&
    rect.width > 20 &&
    rect.height > 20
  );
}

function syncFocusWithinContainer(container: HTMLElement): boolean {
  const containerRect = container.getBoundingClientRect();
  const candidates = container.querySelectorAll<HTMLElement>('[data-focuskey]');
  const idealY = containerRect.top + containerRect.height * 0.4;
  let bestKey: string | null = null;
  let bestScore = Infinity;

  candidates.forEach((el) => {
    const key = el.getAttribute("data-focuskey");
    if (!key || !doesFocusableExist(key)) return;

    const rect = el.getBoundingClientRect();
    if (rect.bottom <= containerRect.top + 25 || rect.top >= containerRect.bottom - 25) return;
    if (rect.right <= containerRect.left + 20 || rect.left >= containerRect.right - 20) return;

    const centerY = rect.top + rect.height / 2;
    const score = Math.abs(centerY - idealY);
    if (score < bestScore) {
      bestScore = score;
      bestKey = key;
    }
  });

  if (bestKey && doesFocusableExist(bestKey)) {
    setFocus(bestKey);
    const targetEl = container.querySelector<HTMLElement>(`[data-focuskey="${bestKey}"]`);
    if (targetEl) targetEl.focus({ preventScroll: true });
    return true;
  }
  return false;
}

/**
 * Step-based vertical TV navigation for remote slider (touchpad swipe / wheel)
 * and Page Up / Page Down / Channel Up / Channel Down keys.
 *
 * Replicates the exact behavior of physical TV remote ArrowDown and ArrowUp:
 * - From Navigation Header -> Down moves to Hero Section (hero-carousel) at scrollY=0.
 * - From Hero Section -> Down moves to Section 1 (the first rail after hero),
 *   anchoring it at y=105px and focusing the first LANDSCAPE card (spotlight-lead-fixed).
 * - From a rail: advances or steps back through rails in-place with the landscape card at Slot 0.
 * - From Rail 0 up: returns to Hero Carousel at scrollY=0 and focuses hero-carousel.
 * - From Hero Carousel up: returns to the Navigation Header (active nav tab).
 */
export function stepTVVerticalNavigation(direction: "up" | "down"): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  // 1. If an active scrollable modal is open, scroll that modal
  const modalScrollEl = document.querySelector<HTMLElement>(
    '[data-focuskey="MODAL_SEARCH"] .overflow-y-auto, [data-focuskey="MODAL_ASSET_DETAIL"] .overflow-y-auto, [role="dialog"] .overflow-y-auto'
  );
  if (modalScrollEl) {
    const scrollDelta = Math.round(modalScrollEl.clientHeight * 0.65) * (direction === "down" ? 1 : -1);
    modalScrollEl.scrollBy({ top: scrollDelta, behavior: "smooth" });
    setTimeout(() => {
      syncFocusToViewport();
    }, 180);
    return true;
  }

  // 2. Identify active focus zone
  const currentFocusKey = getCurrentFocusKey();
  const isNavFocused = Boolean(
    (currentFocusKey && (
      currentFocusKey.startsWith("nav-link") ||
      currentFocusKey.startsWith("navbar-") ||
      currentFocusKey.startsWith("nav-") ||
      currentFocusKey === "profile-dropdown-boundary"
    )) ||
    (typeof document !== "undefined" && document.activeElement && (
      document.activeElement.closest("header") ||
      document.activeElement.closest("nav")
    ))
  );

  const hasHeroContainer = Boolean(document.getElementById("hero-carousel-container"));
  const isHeroFocused = currentFocusKey === "hero-carousel" || (!isNavFocused && window.scrollY <= 120 && hasHeroContainer);

  const section1 = document.querySelector<HTMLElement>('section[data-section-index="1"]');
  const leadCard = document.querySelector<HTMLElement>('[data-focuskey="spotlight-lead-fixed"]');

  if (direction === "down") {
    // A. Down from Navigation Header -> Moves to HERO section (if present)
    if (isNavFocused) {
      if (hasHeroContainer && doesFocusableExist("hero-carousel")) {
        window.scrollTo({ top: 0, behavior: "auto" });
        const hero = document.getElementById("hero-carousel-container");
        hero?.focus({ preventScroll: true });
        setFocus("hero-carousel");
        useActiveRailStore.getState().setActiveSectionIndex(0);
        return true;
      }
      // If no hero section on this page, fall through to first content section below
    }

    // B. Down from Hero Section -> Moves to Section 1 (the first LANDSCAPE card)
    if (isHeroFocused && section1 && leadCard) {
      const rect = section1.getBoundingClientRect();
      const targetTop = Math.max(0, (window.scrollY || window.pageYOffset) + rect.top - 105);
      window.scrollTo({ top: targetTop, behavior: "auto" });
      leadCard.focus({ preventScroll: true });
      if (doesFocusableExist("spotlight-lead-fixed")) {
        setFocus("spotlight-lead-fixed");
      }
      useActiveRailStore.getState().setActiveSectionIndex(1);
      return true;
    }

    // C. Down while already on a rail -> Advance to next rail via tv-rail-step
    if (section1 && leadCard) {
      document.dispatchEvent(new CustomEvent("tv-rail-step", { detail: { direction: "down" } }));
      return true;
    }
  }

  if (direction === "up") {
    // A. Up while already in Navigation Header -> stay in nav
    if (isNavFocused) {
      return true;
    }

    // B. Up from Hero Section -> Moves up into the Navigation Header (active tab)
    if (isHeroFocused) {
      const activeNavLink = (
        document.querySelector('header [data-active="true"][data-focuskey]') ||
        document.querySelector('header [data-focuskey^="nav-link-"]')
      ) as HTMLElement | null;
      if (activeNavLink) {
        const key = activeNavLink.getAttribute("data-focuskey");
        if (key && doesFocusableExist(key)) {
          setFocus(key);
          activeNavLink.focus();
        }
      }
      return true;
    }

    // C. Up from a rail -> Steps back up through rails or returns to Hero
    if (section1 && leadCard) {
      document.dispatchEvent(new CustomEvent("tv-rail-step", { detail: { direction: "up" } }));
      return true;
    }
  }

  // 3. Fallback for non-spotlight pages (e.g. genre listing, simple pages): standard viewport scroll
  const scrollDelta = Math.round(window.innerHeight * 0.65) * (direction === "down" ? 1 : -1);
  window.scrollBy({ top: scrollDelta, behavior: "smooth" });
  setTimeout(() => {
    syncFocusToViewport();
  }, 180);
  return true;
}


