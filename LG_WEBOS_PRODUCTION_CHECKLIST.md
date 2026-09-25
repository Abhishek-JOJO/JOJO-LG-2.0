# 📺 LG webOS TV Production Deployment & App Store Submission Checklist

> **Target Platform**: LG webOS TV (webOS 4.0 through webOS 24)  
> **App Package ID**: `in.jojoapp.jojo`  
> **App Version**: `1.0.0` (Increment before new store submissions)  
> **Framework**: Next.js 16 (Static HTML Export `output: 'export'`) + HLS.js + TanStack Query  
> **Target Store**: LG Content Store / LG Seller Lounge  

---

## 📋 1. Core App Configuration (`public/appinfo.json`)

Ensure all values in `public/appinfo.json` strictly match LG Seller Lounge submission requirements before running the final production build:

- [ ] **`id`**: Must be a unique reverse-domain identifier (`in.jojoapp.jojo`). Once submitted, this ID **cannot** be changed.
- [ ] **`version`**: Semantic version string (e.g. `1.0.0`). Must be bumped for every new submission (e.g. `1.0.1`).
- [ ] **`vendor`**: Company or publisher name (e.g. `"JOJO"`). Must match the developer name registered in the LG Seller Lounge.
- [ ] **`type`**: `"web"`.
- [ ] **`main`**: `"index.html"`.
- [ ] **`resolution`**: `"1920x1080"`. (Always target 1080p Full HD UI; webOS hardware automatically upscales to 4K/8K displays without dropping UI frame rates).
- [ ] **`disableBackHistoryAPI`**: `true` (Mandatory: prevents browser-style back button collisions with LG physical remote Back key `461`).
- [ ] **`requiredPermissions`**: `["internet", "media.operation"]`.
- [ ] **`icon`** & **`largeIcon`**: 
  - Standard icon: `icon.png` (80x80px or 130x130px PNG with transparent background).
  - Large icon: `largeIcon.png` (160x160px PNG).

---

## 🛠️ 2. Build & Packaging Protocol

All builds must use **Node.js 20 LTS** to ensure build scripts, polyfills, and Turbopack run reliably.

```bash
# 1. Switch to Node 20
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# 2. Run clean production static export
npm run build:prod

# 3. Package the webOS IPK
npm run package:ipk

# 4. Verify IPK generation
ls -lh in.jojoapp.jojo_*.ipk
```

### Build Verification Checklist:
- [ ] **Zero TypeScript Errors**: Build completes without failing type-checks.
- [ ] **Zero Dynamic Bailout Warnings**: Static generation logs show `56/56` static routes compiled with **0** `NEXT_STATIC_GEN_BAILOUT` warnings.
- [ ] **WebOS File Sanitization**: `[webOS Fix]` script automatically renames `~` Webpack chunks to `_` and rewrites absolute paths to `./` relative paths for `file://` protocol compatibility.
- [ ] **No Dead Web Code**: SEO schemas (`ld+json`), sitemap generation, and server cookie dependencies are disabled for the TV bundle.

---

## 🎮 3. Remote Control & Spatial Navigation Checklist

LG QA testers will reject any app where navigation gets stuck or fails on a basic remote.

- [ ] **Standard D-Pad Navigation**:
  - `VK_UP` (38), `VK_DOWN` (40), `VK_LEFT` (37), `VK_RIGHT` (39) navigate between rails, banners, cards, and buttons predictably.
  - Active focused element has a clear, visible focus border/halo/scale effect.
  - Focus is never lost into a "dead zone" (e.g. when scrolling through rail lists).
- [ ] **Enter / Select Key** (`VK_ENTER` - 13):
  - Triggers selection, opens detail modals, plays content, or clicks active buttons.
- [ ] **Back Key Handling** (`VK_BACK` - 461 & fallback 27):
  - In Video Player: Exits playback and returns to previous detail page without audio leak.
  - In Modals / Drawers: Closes the active modal before navigating back in page history.
  - On Home Screen: Prompts an "Exit App?" confirmation dialog or smoothly exits to TV Home.
- [ ] **Magic Remote (Air Mouse / Pointer)**:
  - Moving the Magic Remote pointer highlights cards/buttons on hover.
  - Clicking with the pointer triggers the exact same action as the D-pad Enter key.
  - Pointer auto-hides or hands back focus cleanly when user switches back to D-pad arrow keys.
- [ ] **Magic Remote Scroll Wheel**:
  - Scrolling the wheel up/down vertically scrolls page rails without trapping focus.
- [ ] **Media Hardware Keys** (On remotes equipped with dedicated media buttons):
  - Play (`415`), Pause (`19`), Stop (`413`), Fast-Forward (`417`), Rewind (`412`) control the player.

---

## 🎬 4. Video Player & Media Subsystem Quality Check

- [ ] **Hardware Decoder Release**:
  - Exiting the player thoroughly calls `hls.destroy()`, removes `<video>` source, and frees the hardware video pipeline.
  - Playing 5 different videos consecutively never produces a black screen or decoder allocation error.
- [ ] **Subtitles & Captions**:
  - Subtitle button automatically hides if no VTT/subtitle tracks are present in the HLS manifest.
  - Focus in the Subtitles/Audio selector modal is trapped properly and navigable via D-pad.
  - Turning subtitles ON displays sync-accurate text; turning OFF hides text instantly.
- [ ] **Stream Bitrate Switching (ABR)**:
  - Adaptive bitrate switches smoothly between 1080p, 720p, and 480p based on TV network bandwidth.
- [ ] **Audio/Video Sync**:
  - Audio remains in sync across fast-forward, rewind, and seek operations.

---

## ⚡ 5. Performance, Memory & webOS Lifecycle

- [ ] **Cold Boot Startup Time**:
  - App launches and displays splash/skeleton/home rail within **under 4 seconds** on physical TV.
- [ ] **Memory Footprint**:
  - App DOM memory heap stays below **180 MB** during continuous browsing.
  - Memory does not leak when navigating back and forth across 20+ detail pages.
- [ ] **TV Suspension (Home Button Pressed During Playback)**:
  - Video and audio pause immediately when app is hidden (`document.hidden === true` / `visibilitychange`).
  - Video does **not** continue playing sound in the background while user is on the webOS dashboard.
- [ ] **TV Wake / Foreground Resume**:
  - Returning to the app restores state gracefully without requiring a full app force-restart.
- [ ] **Network Loss / Offline Recovery**:
  - Unplugging/disconnecting Wi-Fi displays a friendly retry/offline banner instead of a blank white screen.

---

## 🔐 6. Authentication, Analytics & API Security

- [ ] **Direct Client API Connection**:
  - Client communicates directly with production API endpoints (`https://...`) using client-side payload encryption.
  - No requests attempt to call localhost or server-side `/api/*` routes.
- [ ] **TV Login Flow**:
  - QR code / 6-digit TV link code generates reliably and polls/websockets correctly for activation from mobile.
  - OTP/Manual login works cleanly with on-screen TV keyboard.
- [ ] **Session Persistence**:
  - User session tokens persist across app closures and TV power cycles via `localStorage`.
- [ ] **Analytics Telemetry**:
  - All analytics events report `"platform": "LGTV"`.
  - Batching / queueing handles intermittent TV network drops without dropping events.

---

## 📦 7. LG Seller Lounge Store Assets Deliverable Matrix

Prepare the following assets for the LG Seller Lounge upload portal:

| Asset Name | Resolution | Format | Max File Size | Description |
| :--- | :---: | :---: | :---: | :--- |
| **App Package** | N/A | `.ipk` | < 50 MB | Production-signed or standard package (`in.jojoapp.jojo_*.ipk`) |
| **App Tile Icon** | `130 x 130` px | PNG (24-bit, transparent) | < 500 KB | Displayed in LG webOS Home Launcher bar |
| **Large Icon** | `160 x 160` px | PNG (24-bit, transparent) | < 500 KB | Displayed in LG Content Store App details |
| **Splash Background** | `1920 x 1080` px | PNG / JPG | < 2 MB | Displayed during initial app loading |
| **Store Screenshots** | `1920 x 1080` px | PNG / JPG | < 3 MB each | 3 to 5 screenshots of Home, Detail, Player, and Search (no device bezels) |

---

## 📝 8. LG Review Submission Notes & Test Credentials

Include the following in the **Reviewer Notes** field in LG Seller Lounge:

- [ ] **Test User Credentials**:
  - **Account / Mobile Number**: `[Enter QA Test Number]`
  - **Password / Fixed OTP**: `[Enter QA Static Passcode]`
  - **Active Subscription**: Provide an account with an active premium plan so LG QA can verify full video playback.
- [ ] **Key Feature Verification Steps**:
  1. Launch app -> Observe Home rails and banner carousel auto-play.
  2. Use D-Pad to navigate to any Movie / Series card -> Press Enter.
  3. Detail page loads -> Select "Play" -> Verify 1080p playback and subtitle toggle.
  4. Press Remote Back button -> Returns to Detail -> Returns to Home.
  5. Open Search -> Enter title using TV keyboard -> Results populate.
- [ ] **Geographic Availability**: Ensure backend geo-blocking allows testing from LG QA verification IPs (Korea, US, India).
- [ ] **Legal URL Links**:
  - Terms of Service URL: `https://jojoapp.in/terms-conditions`
  - Privacy Policy URL: `https://jojoapp.in/privacy-policy`

---

## 🚀 9. Final Pre-Flight Sign-Off

- [ ] **Tested on Physical LG TV**: Verified on at least one webOS hardware target using:
  ```bash
  ares-install -d mytv in.jojoapp.jojo_1.0.0_all.ipk
  ares-launch -d mytv in.jojoapp.jojo
  ```
- [ ] **Console Cleanliness**: Zero uncaught exceptions or React hydration crashes in Web Inspector (`ares-inspect`).
- [ ] **Production Environment Flag**: Tested with `NODE_ENV=production` and production API gateways.

**Sign-off by**: Senior Lead Engineer  
**Date**: `____________________`  
**Version Approved**: `1.0.0`
