import { create } from "zustand";

interface ExitConfirmStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/**
 * Drives the "Exit JOJO?" confirmation popup shown when the remote's Back key
 * is pressed on the true home page (nothing left to navigate back to in-app).
 * Triggered from RemoteManager.ts instead of calling exitWebOSApp() directly.
 */
export const useExitConfirmStore = create<ExitConfirmStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
