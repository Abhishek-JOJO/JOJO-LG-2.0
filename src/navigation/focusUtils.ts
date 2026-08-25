"use client";

import { setFocus } from "@noriginmedia/norigin-spatial-navigation";

/**
 * restorePageFocus — Rock-solid focus restoration helper for TV Spatial Navigation.
 *
 * When navigating back from AssetDetail page/modal to Home Page or any listing page,
 * this function polls the DOM to guarantee focus is restored to a valid node:
 * 1. Hero Carousel (if present)
 * 2. First content rail card on the main page
 * 3. Navbar navigation links (fallback)
 */
export function restorePageFocus() {
  if (typeof window === "undefined") return;

  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;

    // 1. Check if an element on screen ALREADY has visual spatial navigation focus
    const activeFocused = document.querySelector(
      "[data-focuskey].ring-\\[4px\\], [data-focuskey].ring-white, [data-focuskey].border-white"
    );
    if (activeFocused) {
      clearInterval(interval);
      return;
    }

    // 2. Check if hero carousel exists on page
    const heroCard = document.querySelector('[data-focuskey="hero-carousel"]');
    if (heroCard) {
      setFocus("hero-carousel");
      clearInterval(interval);
      return;
    }

    // 3. Find the first focusable card on the main page (excluding modal & navbar nodes)
    const firstCardOnPage = document.querySelector(
      'main [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"]), section [data-focuskey]:not([data-focuskey^="MODAL"]):not([data-focuskey^="nav"])'
    );
    if (firstCardOnPage) {
      const key = firstCardOnPage.getAttribute("data-focuskey");
      if (key) {
        setFocus(key);
        clearInterval(interval);
        return;
      }
    }

    // 4. Fallback: focus first navbar link if page has no cards yet
    const navLink = document.querySelector('[data-focuskey^="nav-link"]');
    if (navLink) {
      const key = navLink.getAttribute("data-focuskey");
      if (key) {
        setFocus(key);
        clearInterval(interval);
        return;
      }
    }

    if (attempts >= 6) {
      clearInterval(interval);
    }
  }, 80);
}
