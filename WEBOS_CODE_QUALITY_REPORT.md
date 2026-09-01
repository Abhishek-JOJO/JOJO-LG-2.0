# LG webOS TV Full Application Code Quality & Technical Architecture Audit Report

> **Target Platform:** LG webOS Smart TV (webOS 3.0 through webOS 24+)  
> **Application Name:** JOJO TV (Web Application / webOS IPK Package)  
> **App Version:** `2.2.32`  
> **Tech Stack:** Next.js 16.2.3 (Static Export), React 19.2.4, TypeScript 5, TailwindCSS v4, `@noriginmedia/norigin-spatial-navigation` (v3.3.0), Shaka Player (v5.1.8), HLS.js (v1.6.16), Zustand (v5.0.12), TanStack React Query (v5.100.1), Axios (v1.18.1).  
> **Packaging & Build System:** webOS TV CLI (`ares-package ./out`), Custom interactive Node build runner (`scripts/build/index.ts`).

---

## 1. Executive Summary & Application Overview

This document provides a comprehensive end-to-end code quality audit and architecture review for **JOJO TV on LG webOS Smart TVs**.

The application is built using **Next.js 16 Static Export** (`output: 'export'`), generating a pure client-side web application (`out/` directory) that is compiled into a native LG webOS IPK binary (`in.jojoapp.jojo`). The architecture is specifically designed to handle low-spec TV hardware constraints (1GB–1.5GB total system RAM), spatial D-Pad navigation, LG Magic Remote pointer tracking, hardware-accelerated video decoding, QR code pairing, and multi-profile authentication.

---

## 2. LG webOS Application Manifest (`appinfo.json`) Audit

Location: [`public/appinfo.json`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/public/appinfo.json)

```json
{
  "id": "in.jojoapp.jojo",
  "version": "1.0.0",
  "vendor": "JOJO",
  "type": "web",
  "main": "index.html",
  "title": "JOJO",
  "icon": "icon.png",
  "largeIcon": "icon.png",
  "requiredPermissions": [
    "internet",
    "media.operation"
  ],
  "resolution": "1920x1080",
  "disableBackHistoryAPI": true
}
```

### Analysis & webOS Compliance Check:
1. **Application ID & Target Resolution:** `in.jojoapp.jojo` uses standard reverse domain identifier. Canvas resolution `1920x1080` matches 1080p UI base canvas scaling on 4K/8K LG TVs.
2. **Permissions:**
   - `internet`: Grants network access for API, CDN, and HLS/DASH media manifest fetching.
   - `media.operation`: Grants system permission for background media playback controls and hardware decoder access.
3. **`disableBackHistoryAPI: true`:** Disables webOS default browser back behavior so key listener logic in [`RemoteManager.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/src/navigation/RemoteManager.ts) retains total authority over screen transitions and app minimization.

---

## 3. Remote Control & Spatial Navigation Architecture

### A. Spatial Navigation Engine & Provider Setup
Location: [`src/navigation/SpatialNavigationProvider.tsx`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/src/navigation/SpatialNavigationProvider.tsx)

* **Engine:** `@noriginmedia/norigin-spatial-navigation` initialized once on client load.
* **Root Context:** Wraps the entire component tree in a top-level focus container (`ROOT_FOCUS_KEY`) with `autoRestoreFocus: true` and `trackChildren: true`.

### B. Remote Key Code Mapping & Minimization Strategy
Location: [`src/navigation/RemoteManager.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/src/navigation/RemoteManager.ts) and [`lib/webos.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/lib/webos.ts)

* **LG webOS Key Map:**
  ```typescript
  export const WEBOS_KEYS = {
    BACK: 461,
    PLAY: 415,
    PAUSE: 19,
    STOP: 413,
    FF: 417,
    RW: 412,
    INFO: 457,
  };
  ```
* **App Minimization (`platformBack`):**
  ```typescript
  export const exitWebOSApp = (): void => {
    if (isWebOS()) {
      try {
        window.webOS?.platformBack?.();
      } catch (e) {
        console.warn('Failed to minimize webOS app', e);
      }
    }
  };
  ```
  *LG Store Requirement:* Pressing BACK on root paths (`/` or `/landing`) calls `window.webOS.platformBack()`. This minimizes the app to background rather than forcing process termination, meeting LG's platform compliance standard.

### C. LG Magic Remote (Air Mouse / Pointer) Synchronization
Location: [`src/navigation/PointerManager.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/src/navigation/PointerManager.ts)

* **Hover Gate Protocol:**
  ```typescript
  const handleCursorStateChange = (e: Event) => {
    hasCursorStateSupport = true;
    pointerVisible = Boolean((e as CustomEvent<{ visibility: boolean }>).detail?.visibility);
  };
  ```
  *Technical Value:* Spatial navigation scrolling shifts DOM elements under an stationary cursor, causing false browser `mouseover` events. `PointerManager.ts` captures native webOS `cursorStateChange` events and gates hover updates so mouseover focus triggers only fire when the Magic Remote pointer is visibly active.

---

## 4. Authentication & TV QR Code Pairing Subsystem

Locations:
- [`app/login/components/QrPairingPanel.tsx`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/app/login/components/QrPairingPanel.tsx)
- [`app/login/components/CountryWithEmailInput.tsx`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/app/login/components/CountryWithEmailInput.tsx)
- [`store/useAuthStore.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/store/useAuthStore.ts)

### Architecture Highlights:
1. **QR Code Generation & Deep Linking:** Renders local QR codes via `qrcode` package encoding deep links (`generatePairingQrUrl`) for mobile phone scanning.
2. **Polling Loop & Expiry:** Polls pairing API every 3 seconds (`POLL_INTERVAL_MS = 3000`) with a 10-minute code expiry limit (`CODE_LIFETIME_MS = 600000`). Utilizes `AbortController` to cancel pending HTTP calls on unmount or code reset.
3. **State Storage & Persistence:** `useAuthStore` manages auth tokens, refresh tokens, user objects, and guest state with local storage persistence and unique TV device ID binding (`getWebOSDeviceID()`).

---

## 5. Video Playback Engine & Hardware Acceleration Architecture

Locations:
- [`features/player/components/OTTPlayer.tsx`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/features/player/components/OTTPlayer.tsx)
- [`features/player/engine/PlayerEngine.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/features/player/engine/PlayerEngine.ts)
- [`features/player/engine/ShakaAdapter.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/features/player/engine/ShakaAdapter.ts)
- [`features/player/engine/PlaybackRecoveryManager.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/features/player/engine/PlaybackRecoveryManager.ts)

```
┌────────────────────────────────────────────────────────────────────────┐
│                              OTTPlayer                                 │
└────────────────────────────────────────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  PlayerEngine              ShakaAdapter              ImaAdsEngine
(State & Control)         (DASH/HLS & DRM)            (Ad Overlays)
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   ▼
                       HTML5 <video> Element
                  (webOS SoC Hardware Decoder)
```

### Key Technical Capabilities:
1. **Multi-Engine Support:** Uses Shaka Player for DASH/HLS DRM playback and native HTML5 video element fallback.
2. **Hardware Video Acceleration:** Direct rendering onto TV hardware decoders via standard HTML5 `<video>` tags.
3. **Playback Recovery Protocol:** `PlaybackRecoveryManager.ts` listens for stream buffer stalls, network drops, and decoder pauses, executing automated exponential backoff retries.
4. **Interactive Overlays:** Includes `ResumePrompt` (remembers past watch position), `NextEpisodeOverlay` (auto-triggers at 95% video completion), VTT thumbnail scrubbing (`fetchAndParseVttThumbnails`), and subtitle styling.

---

## 6. App Navigation Routes & UI Component Hierarchy

### A. Core Routes Structure (`app/` directory)
- `/` & `/landing`: Main home showcase with featured banners and rails.
- `/browse`: Category grid view.
- `/movies`, `/shows`, `/nataks`, `/kids`, `/hot-and-new`: Dedicated category routes.
- `/[contentType]/[...slugAndId]`: Dynamic asset detail page with modal details and episode selector.
- `/watch`: Fullscreen OTT video player view.
- `/login` & `/login/otp`: Login modes (QR code pairing, Mobile OTP, Email).
- `/profile`, `/profile/add-profile`, `/profile/avtar`: Multi-profile manager.
- `/account-settings`: Profile edit, subscription details, gold membership rows.
- `/subscription` & `/payment`: Subscription plans and QR payment flow.
- `/search`: On-screen spatial navigation keyboard & search results.

### B. UI Component Hierarchy (`components/`)
- `components/layout/Navbar.tsx`: TV top navigation bar with spatial focus links (`FocusableNavLink.tsx`).
- `components/content-rail/ContentRailList.tsx`: Horizontal poster rail with focused card auto-scrolling.
- `components/content-rail/cards/BaseContentCard.tsx`: Focusable content card with hover effects, badges, and spatial nav focus hooks.
- `components/ui/JOJOModal.tsx`: Spatial-nav friendly modal dialog container.

---

## 7. State Management & Network Tier Architecture

### A. Zustand Store Layer (`store/`)
- `useAuthStore`: User identity, access tokens, refresh tokens, auth status.
- `usePlayerStore`: Video status, playback speed, captions, feature flags (`PLAYER_FEATURE_FLAGS`).
- `useProfileStore`: Active user profile, avatar selection, PIN locking.
- `useSubscriptionStore`: Active user plan, entitlement status, payment status.
- `useWatchlistStore`: User watchlists with sync to backend APIs.
- `useContinueWatchingStore`: Watch progress synchronization.

### B. Network Tier (`lib/api/client.ts`)
- Built on **Axios** with global interceptors.
- Automatically attaches Bearer tokens, TV Device ID headers (`PalmSystem.deviceInfo`), and app version strings.
- Intercepts `401 Unauthorized` responses to initiate token refresh or trigger session expiration modal (`useSessionExpiredStore`).

---

## 8. Performance, Memory Management & Hardware Optimization

Smart TV platforms have strict memory limits (~150MB–300MB browser heap limit).

### Applied Performance Safeguards:
1. **Static Export Configuration:** [`next.config.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/next.config.ts) sets `output: 'export'` and `images.unoptimized = true`.
2. **Anti-Debugging CPU Overhead Removal:** [`hooks/useProductionSecurity.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/hooks/useProductionSecurity.ts) explicitly disables the 2s `debugger` pause trap on webOS (`!isWebOS()`), avoiding background CPU spikes.
3. **Production Log Stripping:** `compiler.removeConsole` in `next.config.ts` strips `log`, `info`, and `debug` calls in production builds to reduce serial stream I/O.

---

## 9. Security, Compliance & Production Hardening

Location: [`hooks/useProductionSecurity.ts`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/hooks/useProductionSecurity.ts) and [`app/layout.tsx`](file:///Users/parthvaishnavappjojo.in/Desktop/Projects/LG-TV-2.0/app/layout.tsx)

* **Right-Click Interception:** Prevents `contextmenu` and `auxclick` events across `document` and `window`.
* **DevTools Key Blocking:** Blocks `F12`, `Ctrl+Shift+I`, `Cmd+Opt+I`, `Ctrl+Shift+J`, `Ctrl+U`, `Ctrl+S`.
* **Security Headers:** Enforces `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and strict `Permissions-Policy`.

---

## 10. Code Quality Findings & Strategic Recommendations

### Key Strengths:
- **Clean Architecture:** Modular separation between UI, state stores, spatial navigation, and player engine.
- **TV Native Handling:** Flawless hybrid support for D-Pad keys and Magic Remote pointer tracking.
- **Resilient Playback:** Robust error handling and auto-recovery loops for network stalls.

### Areas for Optimization:
1. **Video Player Instance Cleanup:** Ensure `ShakaAdapter` destroys player instances synchronously during unmount to immediately free hardware video decoders before navigating to new screens.
2. **Rail Virtualization:** For home pages with 15+ content rails, consider DOM windowing/virtualization to keep DOM nodes under 1,500 elements.
3. **Polling Interval Safeguards:** Confirm all `setInterval` and `setTimeout` calls in `QrPairingPanel` and player heartbeats check unmount state before scheduling state updates.

---

## 11. Prompts for ChatGPT Deep Code Auditing

Share these prompts with ChatGPT alongside this report for specific code reviews:

### Prompt 1: Video Engine & Hardware Decoder Leak Audit
> "Examine `features/player/engine/PlayerEngine.ts` and `ShakaAdapter.ts`. Check whether Shaka Player instances and HTML5 `<video>` elements properly unbind listeners and destroy media decoders on webOS when unmounted, preventing hardware decoder locked states."

### Prompt 2: Spatial Navigation Memory & Focus Trap Audit
> "Review `src/navigation/SpatialNavigationProvider.tsx`, `RemoteManager.ts`, and `PointerManager.ts`. Evaluate whether navigating between dynamic routes could leave stale focus keys registered in `@noriginmedia/norigin-spatial-navigation`, and recommend focus state reset patterns."

### Prompt 3: State Management & Component Re-render Audit
> "Analyze `store/usePlayerStore.ts` and `store/useAuthStore.ts` for Zustand usage in React 19. Ensure state selectors use narrow subscription fields to prevent full screen re-renders during video playback progress updates."

### Prompt 4: QR Code Polling & Timer Leak Audit
> "Inspect `app/login/components/QrPairingPanel.tsx`. Verify that `AbortController` and cleanup functions prevent async state updates if the user backs out of the login screen mid-poll."

### Prompt 5: DOM Node Virtualization & WebOS RAM Optimization Audit
> "Review `components/content-rail/ContentRailList.tsx` and `features/content-rail/ui/ContentRailsView.tsx`. Provide code recommendations to virtualize off-screen rails and cards to keep total DOM nodes under 1,000 on low-RAM (1GB) LG webOS TVs."

---

*Full Application Code Quality Audit Report generated for JOJO LG webOS TV (v2.2.32).*
