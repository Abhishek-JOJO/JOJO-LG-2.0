import { create } from "zustand";

interface SearchState {
  isSearchOpen: boolean;
  searchText: string;
  debouncedSearch: string;
  setIsSearchOpen: (isOpen: boolean) => void;
  setSearchText: (text: string) => void;
  setDebouncedSearch: (text: string) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isSearchOpen: false,
  searchText: "",
  debouncedSearch: "",
  setIsSearchOpen: (isOpen) =>
    set((state) => {
      if (!isOpen) {
        return { isSearchOpen: false, searchText: "", debouncedSearch: "" };
      }
      return { isSearchOpen: true };
    }),
  setSearchText: (text) => set({ searchText: text }),
  setDebouncedSearch: (text) => set({ debouncedSearch: text }),
  reset: () => set({ isSearchOpen: false, searchText: "", debouncedSearch: "" }),
}));
