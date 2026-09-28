'use client';

import { useEffect } from 'react';
import { setFocus, doesFocusableExist } from '@noriginmedia/norigin-spatial-navigation';
import { syncFocusToViewport, stepTVVerticalNavigation } from './focusUtils';

/**
 * Bridges the LG Magic Remote's pointer (air-mouse) mode and wheel/touchpad
 * slider scrolling into spatial navigation.
 *
 * webOS TVs fire a native `cursorStateChange` event on `document` whenever the
 * Magic Remote pointer appears (user tilts/shakes the remote) or disappears
 * (user presses a D-pad/OK button). We mirror pointer hover onto the spatial
 * nav focus engine so the two input modes never fall out of sync — whichever
 * card the cursor was last over is exactly where D-pad navigation resumes from.
 *
 * It also handles vertical wheel / touch-slider events from both the physical
 * Magic Remote wheel and the LG ThinQ smartphone remote app's up/down slider,
 * replicating remote ArrowDown/ArrowUp behavior with seamless landscape card
 * spotlight navigation and viewport synchronization.
 */
export const useRemotePointer = () => {
  useEffect(() => {
    let lastFocusKey: string | null = null;
    let pointerVisible = true;
    let hasCursorStateSupport = false;
    let wheelScrollTimer: ReturnType<typeof setTimeout> | null = null;
    let wheelAccumulator = 0;
    let wheelCooldown = false;
    let wheelCooldownTimer: ReturnType<typeof setTimeout> | null = null;
    const WHEEL_THRESHOLD = 70;

    /**
     * Mouse hover does NOTHING to focus.
     * On LG webOS TV, cursor drift or hovering over cards must never steal or
     * disrupt the active remote focus, ensuring the remote focus stays rock-solid
     * and the wheel/touch slider can scroll smoothly without interruption.
     */

    /**
     * When user explicitly clicks with the Magic Remote pointer or presses the
     * mouse wheel OK/Enter button on an element: focus and activate that element.
     */
    const handlePointerClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-focuskey]');
      const focusKey = target?.getAttribute('data-focuskey');
      if (focusKey && doesFocusableExist(focusKey)) {
        setFocus(focusKey);
      }
    };

    /**
     * Handles vertical wheel events from:
     * 1. Physical LG Magic Remote scroll wheel
     * 2. LG ThinQ smartphone remote app vertical slider / trackpad swipe
     */
    const handleWheel = (e: WheelEvent) => {
      if (e.defaultPrevented) return;

      // Allow horizontal drag scrolling on rails to handle horizontal swipes
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }
      if (e.deltaY === 0) return;

      // Check if target is inside an actively scrollable modal/container
      const path = (e.composedPath ? e.composedPath() : []) as HTMLElement[];
      let scrollableContainer: HTMLElement | null = null;

      for (const el of path) {
        if (!(el instanceof HTMLElement)) continue;
        if (el === document.body || el === document.documentElement) break;

        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;

        if (canScroll) {
          const atTop = el.scrollTop <= 0 && e.deltaY < 0;
          const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;
          if (!atTop && !atBottom) {
            scrollableContainer = el;
            break;
          }
        }
      }

      // If inside an actively scrollable modal container, scroll it directly
      if (scrollableContainer) {
        e.preventDefault();
        let deltaY = e.deltaY;
        if (e.deltaMode === 1) deltaY *= 36;
        else if (e.deltaMode === 2) deltaY *= (scrollableContainer.clientHeight * 0.8);
        scrollableContainer.scrollTop += deltaY;
        return;
      }

      // Check if on Spotlight Rails page (Home, Movies, Shows, Nataks)
      const hasSpotlightRails = Boolean(document.querySelector('section[data-section-index="1"]'));

      if (hasSpotlightRails) {
        e.preventDefault();
        if (wheelCooldown) return;

        let deltaY = e.deltaY;
        if (e.deltaMode === 1) deltaY *= 36;
        else if (e.deltaMode === 2) deltaY *= 100;

        wheelAccumulator += deltaY;

        if (Math.abs(wheelAccumulator) >= WHEEL_THRESHOLD) {
          const direction = wheelAccumulator > 0 ? 'down' : 'up';
          wheelAccumulator = 0;
          wheelCooldown = true;

          stepTVVerticalNavigation(direction);

          if (wheelCooldownTimer) clearTimeout(wheelCooldownTimer);
          wheelCooldownTimer = setTimeout(() => {
            wheelCooldown = false;
            wheelAccumulator = 0;
          }, 260); // 260ms cooldown between discrete swipe rail steps
        }
        return;
      }

      // Fallback for non-spotlight pages (free-scrolling)
      e.preventDefault();
      let deltaY = e.deltaY;
      if (e.deltaMode === 1) deltaY *= 36;
      else if (e.deltaMode === 2) deltaY *= (window.innerHeight * 0.8);
      window.scrollBy({ top: deltaY, behavior: 'auto' });

      if (wheelScrollTimer) clearTimeout(wheelScrollTimer);
      wheelScrollTimer = setTimeout(() => {
        syncFocusToViewport();
      }, 140);
    };

    document.addEventListener('click', handlePointerClick, true);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('click', handlePointerClick, true);
      window.removeEventListener('wheel', handleWheel);
      if (wheelScrollTimer) {
        clearTimeout(wheelScrollTimer);
      }
      if (wheelCooldownTimer) {
        clearTimeout(wheelCooldownTimer);
      }
    };
  }, []);
};
