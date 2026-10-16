import { create } from "zustand";
import { DEFAULT_AMBIENT_RGB } from "@/lib/utils/colorExtractor";

export interface AmbientRGB {
  r: number;
  g: number;
  b: number;
}

interface AmbientTintStore {
  layerA: AmbientRGB;
  layerB: AmbientRGB;
  activeLayer: "A" | "B";
  currentColor: AmbientRGB;
  hasActiveColor: boolean;
  setAmbientColor: (color: AmbientRGB) => void;
  resetAmbientColor: () => void;
}

export const useAmbientTintStore = create<AmbientTintStore>((set, get) => ({
  layerA: DEFAULT_AMBIENT_RGB,
  layerB: DEFAULT_AMBIENT_RGB,
  activeLayer: "A",
  currentColor: DEFAULT_AMBIENT_RGB,
  hasActiveColor: false,

  setAmbientColor: (color: AmbientRGB) => {
    const current = get().currentColor;
    if (
      get().hasActiveColor &&
      current.r === color.r &&
      current.g === color.g &&
      current.b === color.b
    ) {
      return;
    }

    const currentLayer = get().activeLayer;
    if (currentLayer === "A") {
      set({
        layerB: color,
        activeLayer: "B",
        currentColor: color,
        hasActiveColor: true,
      });
    } else {
      set({
        layerA: color,
        activeLayer: "A",
        currentColor: color,
        hasActiveColor: true,
      });
    }
  },

  resetAmbientColor: () => {
    set({
      hasActiveColor: false,
    });
  },
}));
