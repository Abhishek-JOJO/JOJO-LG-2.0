import { StorageKey } from "../enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import { create } from "zustand";

type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Lazy initialization function to avoid SSR issues
const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  return localStorageManager.get<Theme>(StorageKey.THEME) ?? "dark";
};

export const useThemeStore = create<ThemeState>((set, get) => {
  // Get initial theme inside the store creator to defer execution
  const initialTheme = getInitialTheme();
  
  // Apply on initial load (client only) and clean up legacy 'undefined' key
  if (typeof window !== "undefined") {
    document.documentElement.setAttribute("data-theme", initialTheme);
    try {
      localStorage.removeItem("undefined");
    } catch {}
  }

  return {
    theme: initialTheme,

    setTheme: (theme) => {
      localStorageManager.set(StorageKey.THEME, theme);
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
      }
      set({ theme });
    },

    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      get().setTheme(next);
    },
  };
});
