import { create } from "zustand";

interface GuestPopupStore {
  isOpen: boolean;
  openGuestPopup: () => void;
  closeGuestPopup: () => void;
}

export const useGuestPopupStore = create<GuestPopupStore>((set) => ({
  isOpen: false,
  openGuestPopup: () => set({ isOpen: true }),
  closeGuestPopup: () => set({ isOpen: false }),
}));
