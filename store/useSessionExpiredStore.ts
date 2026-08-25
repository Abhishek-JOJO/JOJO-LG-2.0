import { create } from "zustand";

interface SessionExpiredStore {
  isVisible: boolean;
  /** Call this when a 401 is received from any API call */
  showSessionExpired: () => void;
  /** Called internally when the user clicks "Login" — do not call externally */
  _dismiss: () => void;
}

/**
 * Session Expired Store
 *
 * Triggered globally whenever the API client receives a 401 Unauthorized.
 * The modal it drives is intentionally non-dismissible — the user MUST
 * click the Login button to proceed.
 */
export const useSessionExpiredStore = create<SessionExpiredStore>((set, get) => ({
  isVisible: false,

  showSessionExpired: () => {
    // Guard: only show once (avoid re-triggering from concurrent 401s)
    if (!get().isVisible) {
      set({ isVisible: true });
    }
  },

  _dismiss: () => set({ isVisible: false }),
}));
