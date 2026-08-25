import { create } from "zustand";

interface BrowseHiddenState {
  hiddenId: string | null;
  hiddenSubnavId: number | null;
  setHiddenParams: (id: string | null, subnavId: number | null) => void;
  clearHiddenParams: () => void;
}

export const useBrowseHiddenStore = create<BrowseHiddenState>((set) => ({
  hiddenId: null,
  hiddenSubnavId: null,
  setHiddenParams: (id, subnavId) => set({ hiddenId: id, hiddenSubnavId: subnavId }),
  clearHiddenParams: () => set({ hiddenId: null, hiddenSubnavId: null }),
}));
