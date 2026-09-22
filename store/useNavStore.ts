import { create } from "zustand";
import { startTransition } from "react";

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
  // Wrap in startTransition so React treats downstream re-renders (ContentRailsView,
  // hero carousel, etc.) as low-priority concurrent work. The navbar focus highlight
  // updates instantly while the heavy content swap renders in the background.
  setActiveBrowseTab: (tab) => startTransition(() => {
    set((state) => state.activeBrowseTab === tab ? state : { activeBrowseTab: tab });
  }),
}));
