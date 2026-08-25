import { create } from "zustand";

interface NavState {
  heroLoginVisible: boolean;
  setHeroLoginVisible: (visible: boolean) => void;
  persistedNavItems: any[];
  setPersistedNavItems: (items: any[]) => void;
}

export const useNavStore = create<NavState>((set) => ({
  heroLoginVisible: true,
  setHeroLoginVisible: (visible) => set({ heroLoginVisible: visible }),
  persistedNavItems: [],
  setPersistedNavItems: (items) => set({ persistedNavItems: items }),
}));
