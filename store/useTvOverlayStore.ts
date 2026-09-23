import { create } from "zustand";

export type TvOverlayScreen = "account-settings" | "watching";

interface TvOverlayState {
  screen: TvOverlayScreen | null;
  open: (screen: TvOverlayScreen) => void;
  close: () => void;
  clear: () => void;
}

const TV_OVERLAY_HISTORY_KEY = "__jojo_tv_overlay__";

export const useTvOverlayStore = create<TvOverlayState>((set, get) => ({
  screen: null,

  open: (screen) => {
    if (typeof window === "undefined" || window.location.protocol !== "file:") return;

    // Add one history entry when entering the in-app screen. Moving between
    // Account Settings and Switch Profile reuses that entry, so one Back press
    // always returns to the browse screen beneath it.
    if (!get().screen) {
      window.history.pushState(
        { ...(window.history.state || {}), [TV_OVERLAY_HISTORY_KEY]: true },
        "",
        window.location.href
      );
    }

    set({ screen });
  },

  close: () => {
    if (!get().screen) return;
    set({ screen: null });

    if (
      typeof window !== "undefined" &&
      window.history.state?.[TV_OVERLAY_HISTORY_KEY]
    ) {
      window.history.back();
    }
  },

  // Used by popstate: the browser already consumed the overlay history entry,
  // so no second history.back() must be issued.
  clear: () => set({ screen: null }),
}));

