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

interface AssetDetailState {
  activeAssetId: string | null;
  activeContentType: string | null;
  activeTitle: string | null;
  isOpen: boolean;
  originalPath: string | null;
  historyCount: number;
  shouldScrollToBottom: boolean;
  openAssetDetail: (id: string, contentType: string | number, title: string) => void;
  closeAssetDetail: () => void;
  navigateBackToAsset: (id: string, contentType: string | number, title: string) => void;
  resetScrollFlag: () => void;
  resetAssetDetailModal: () => void;
}

export const useAssetDetailStore = create<AssetDetailState>((set, get) => ({
  activeAssetId: null,
  activeContentType: null,
  activeTitle: null,
  isOpen: false,
  originalPath: null,
  historyCount: 0,
  shouldScrollToBottom: false,

  openAssetDetail: (id, contentType, title) => {
    if (typeof window === "undefined") return;

    // Reset global card hover state when modal opens
    usePlayerStore.getState().setIsAnyCardHovered(false);

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
      isOpen: true,
      originalPath,
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
      isOpen: false,
      originalPath: null,
      historyCount: 0,
      shouldScrollToBottom: false,
    });
  },
}));
