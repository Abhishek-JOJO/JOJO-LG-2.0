import { create } from "zustand";

export interface UpdateInfo {
  latestVersion: string;
  minRequiredVersion?: string;
  forceUpdate?: boolean;
  title?: string;
  message?: string;
  releaseNotes?: string[];
  updateUrl?: string;
}

interface AppUpdateState {
  isOpen: boolean;
  updateInfo: UpdateInfo | null;
  openUpdateModal: (info: UpdateInfo) => void;
  closeUpdateModal: () => void;
}

export const useAppUpdateStore = create<AppUpdateState>((set) => ({
  isOpen: false,
  updateInfo: null,
  openUpdateModal: (info) => set({ isOpen: true, updateInfo: info }),
  closeUpdateModal: () => set({ isOpen: false }),
}));
