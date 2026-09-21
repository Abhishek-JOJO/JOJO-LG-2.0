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
  setActiveBrowseTab: (tab) => set({ activeBrowseTab: tab }),
}));
