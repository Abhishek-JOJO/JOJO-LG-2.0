import { create } from "zustand";

interface NavState {
  heroLoginVisible: boolean;
  setHeroLoginVisible: (visible: boolean) => void;
  persistedNavItems: any[];
  setPersistedNavItems: (items: any[]) => void;
  activeBrowseTab: string | null;
  setActiveBrowseTab: (tab: string | null) => void;
}

export const useNavStore = create<NavState>((set) => ({
  heroLoginVisible: true,
  setHeroLoginVisible: (visible) => set({ heroLoginVisible: visible }),
  persistedNavItems: [],
  setPersistedNavItems: (items) => set({ persistedNavItems: items }),
  activeBrowseTab: null,
  // Synchronous update — on webOS ARM the React concurrent scheduler (startTransition)
  // adds 700-1000ms overhead before processing the update. Switching tabs must feel
  // instant, not low-priority.
  setActiveBrowseTab: (tab) =>
    set((state) => state.activeBrowseTab === tab ? state : { activeBrowseTab: tab }),
}));
