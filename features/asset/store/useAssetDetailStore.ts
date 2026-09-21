import { create } from "zustand";
import { usePlayerStore } from "@/store/usePlayerStore";

export const slugify = (s: string): string =>
  typeof s === "string"
    ? s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")  // Remove diacritics
        .replace(/['"]/g, "")              // Remove quotes
        .replace(/[^a-z0-9]+/g, "-")       // Non-alphanumeric to hyphens
        .replace(/^-+|-+$/g, "")           // Trim leading/trailing hyphens
    : "";

export const unslugify = (slug: string): string => {
  if (!slug) return "";
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export function getAssetTypeSlug(type: string | number | undefined): string {
  if (!type) return "movies";
  const t = typeof type === "string" ? type.toUpperCase() : type;
  if (t === 1 || t === "MOVIE") return "movies";
  if (t === 2 || t === 3 || t === "SHOW" || t === "SERIES" || t === "WEB SERIES" || t === "WEB_SERIES") return "shows";
  if (t === 4 || t === 6 || t === "NATAK" || t === "NATAKS" || t === "STAGE_PLAY" || t === "PLAY") return "nataks";
  if (t === 5 || t === "EPISODE") return "shows";
  return "movies";
}

// A page that wants the asset-detail modal open again after a hard reload
// (e.g. leaving the player) can't just navigate straight to a "/<type>/<slug>/<id>"
// URL like openAssetDetail's own modal does internally — that URL has no
// static file behind it in `output: "export"` (only the SSG placeholder
// route exists), so a real `location.href` navigation there fails and hands
// control to webOS's native "UNABLE TO LOAD" screen. openAssetDetail works
// around this by only ever pushing shallow history state, never actually
// changing the document's URL — but that only works from within the SAME
// document; it can't reopen anything after a hard reload to a different one.
// These two functions are the cross-reload equivalent: stash which asset to
// reopen in sessionStorage (survives the reload) before navigating to a
// route that's guaranteed to exist as a real static file (e.g. home), then
// consume it once on that page's first mount and call openAssetDetail for
// real, same as if the user had clicked the card themselves.
const PENDING_OPEN_KEY = "jojo_pending_asset_detail";

export function schedulePendingAssetDetailOpen(
  id: string,
  contentType: string | number,
  title: string,
  cachedAsset?: any
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_OPEN_KEY, JSON.stringify({ id, contentType, title, cachedAsset }));
    if (cachedAsset) {
      sessionStorage.setItem(`asset_cache_${id}`, JSON.stringify(cachedAsset));
    }
  } catch {
    // ignore — worst case the modal just doesn't reopen
  }
}

export function consumePendingAssetDetailOpen(): {
  id: string;
  contentType: string | number;
  title: string;
  cachedAsset?: any;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_OPEN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_OPEN_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

interface AssetDetailState {
  activeAssetId: string | null;
  activeContentType: string | null;
  activeTitle: string | null;
  /**
   * The already-known content-rail item the user clicked, if any — lets the
   * detail view's loading skeleton show the real poster/title instantly
   * instead of pure shimmer while the full asset details fetch in the
   * background. Purely cosmetic (see AssetDetailView's skeleton branch): never
   * read by any gating/focus/button logic, so a partial/missing field here
   * can't affect anything beyond that one loading frame.
   */
  activePreviewItem: any | null;
  isOpen: boolean;
  originalPath: string | null;
  historyCount: number;
  shouldScrollToBottom: boolean;
  returnFocusKey: string | null;
  clearReturnFocusKey: () => void;
  openAssetDetail: (id: string, contentType: string | number, title: string, previewItem?: any) => void;
  closeAssetDetail: () => void;
  navigateBackToAsset: (id: string, contentType: string | number, title: string) => void;
  resetScrollFlag: () => void;
  resetAssetDetailModal: () => void;
}

export const useAssetDetailStore = create<AssetDetailState>((set, get) => ({
  activeAssetId: null,
  activeContentType: null,
  activeTitle: null,
  activePreviewItem: null,
  isOpen: false,
  originalPath: null,
  historyCount: 0,
  shouldScrollToBottom: false,
  returnFocusKey: null,
  clearReturnFocusKey: () => set({ returnFocusKey: null }),

  openAssetDetail: (id, contentType, title, previewItem) => {
    if (typeof window === "undefined") return;

    // Reset global card hover state when modal opens
    usePlayerStore.getState().setIsAnyCardHovered(false);

    // If modal is not already open, capture the exact focused key to return to upon close
    let currentKey: string | null = null;
    try {
      const spatialNav = require("@noriginmedia/norigin-spatial-navigation");
      currentKey = spatialNav?.getCurrentFocusKey?.() || null;
    } catch { }

    const returnFocusKey = get().isOpen 
      ? get().returnFocusKey 
      : (currentKey || (document.activeElement?.getAttribute("data-focuskey") || null));

    const currentPath = window.location.pathname + window.location.search;
    const typeSlug = getAssetTypeSlug(contentType);
    const titleSlug = slugify(title);
    const targetUrl = titleSlug ? `/${typeSlug}/${titleSlug}/${id}` : `/${typeSlug}/${id}`;

    const VALID_TYPES = ["movies", "shows", "nataks", "live", "kids", "kidz"];
    const isAssetPath = VALID_TYPES.some((t) => currentPath.startsWith(`/${t}/`));

    // If modal is not already open, save the original URL path so we can return to it
    const originalPath = get().isOpen 
      ? get().originalPath 
      : (isAssetPath ? "/" : currentPath);

    // Push the state shallowly without changing the URL to prevent Next.js App Router 
    // from attempting to fetch an un-generated static route in 'output: export' mode.
    window.history.pushState({ type: "asset-detail", id, contentType: typeSlug, title }, "", window.location.href);

    set((state) => ({
      activeAssetId: id,
      activeContentType: typeSlug,
      activeTitle: title,
      activePreviewItem: previewItem ?? null,
      isOpen: true,
      originalPath,
      returnFocusKey,
      // Increment historyCount if we were already open
      historyCount: state.isOpen ? state.historyCount + 1 : 0,
      shouldScrollToBottom: false,
    }));
  },

  closeAssetDetail: () => {
    if (typeof window === "undefined") return;

    const { originalPath, isOpen } = get();
    if (!isOpen) return;

    const hadAssetDetailHistoryEntry = window.history.state?.type === "asset-detail";
    const targetPath = originalPath || "/";

    // Reset app state synchronously, before touching browser history — see below for
    // why history is never allowed to drive this.
    set({
      activeAssetId: null,
      activeContentType: null,
      activeTitle: null,
      activePreviewItem: null,
      isOpen: false,
      originalPath: null,
      historyCount: 0,
      shouldScrollToBottom: false,
    });

    // Overwrite (never pop/go) the history entry openAssetDetail pushed while open.
    // This used to unwind it with history.go(-(historyCount+1)), but go() only
    // resolves later via an async popstate event — and Next.js's own App Router
    // also listens for popstate globally for its client-side routing, so that
    // event round-trips through the router's own reconciliation against whatever
    // entry we land on. On this TV hardware that reconciliation reliably re-opened
    // this modal about a second later (isOpen flipping back true, landing focus on
    // the modal's own empty boundary key instead of the page underneath) — and even
    // ignoring that, go() simply resolving late was already enough for a second
    // physical Back press to land while isOpen was still stale-true. The physical
    // remote's Back key never needed a real browser navigation to begin with — it's
    // handled directly, synchronously, right here — so replaceState (which never
    // fires popstate) removes the stale "asset-detail" marker just as effectively,
    // without ever handing control back to the router.
    if (hadAssetDetailHistoryEntry) {
      window.history.replaceState({ type: "page" }, "", window.location.href);
      return;
    }

    if (window.location.pathname !== targetPath.split("?")[0]) {
      window.history.pushState({ type: "page" }, "", targetPath);
    }
  },

  navigateBackToAsset: (id, contentType, title) => {
    const typeSlug = getAssetTypeSlug(contentType);
    set((state) => ({
      activeAssetId: id,
      activeContentType: typeSlug,
      activeTitle: title,
      historyCount: Math.max(0, state.historyCount - 1),
      shouldScrollToBottom: true, // Mark that we should scroll to bottom on back navigation
    }));
  },

  resetScrollFlag: () => {
    set({ shouldScrollToBottom: false });
  },

  resetAssetDetailModal: () => {
    set({
      activeAssetId: null,
      activeContentType: null,
      activeTitle: null,
      activePreviewItem: null,
      isOpen: false,
      originalPath: null,
      historyCount: 0,
      shouldScrollToBottom: false,
    });
  },
}));
