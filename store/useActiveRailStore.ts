import { create } from "zustand";

interface ActiveRailState {
  activeSectionIndex: number | null;
  setActiveSectionIndex: (index: number | null) => void;
}

export const useActiveRailStore = create<ActiveRailState>((set) => ({
  activeSectionIndex: null,
  setActiveSectionIndex: (index) => set({ activeSectionIndex: index }),
}));
