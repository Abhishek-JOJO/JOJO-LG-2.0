import { appConfig } from "@/lib/config/app.config";
import type { ToastItem, ToastType } from "@components/feedback/Toast";
import { create } from "zustand";

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, type = "info") => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));

    // Auto-dismiss after TOAST_DURATION_MS
    setTimeout(() => get().dismiss(id), appConfig.LIMITS.TOAST_DURATION_MS);
  },

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));
