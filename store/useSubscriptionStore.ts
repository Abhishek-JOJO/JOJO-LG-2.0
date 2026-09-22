import { create } from "zustand";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import { StorageKey } from "@/enums/storage.enum";

interface SubscriptionStore {
  isGold: boolean | null; // null = pending/unknown, true = active gold, false = not gold
  subscriptionData: any | null;
  setSubscriptionData: (data: any) => void;
  clearSubscription: () => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => {
  let initialIsGold: boolean | null = null;
  let initialData: any | null = null;

  if (typeof window !== "undefined") {
    try {
      const cachedIsGold = localStorageManager.get<boolean>(StorageKey.IS_GOLD);
      const cachedData = localStorageManager.get<any>(StorageKey.SUBSCRIPTION_DATA);
      if (typeof cachedIsGold === "boolean") {
        initialIsGold = cachedIsGold;
      }
      if (cachedData) {
        initialData = cachedData;
      }
    } catch {}
  }

  return {
    isGold: initialIsGold,
    subscriptionData: initialData,
    setSubscriptionData: (data: any) => {
      const isExpired = data?.data?.subscription?.dEndDate
        ? new Date(data.data.subscription.dEndDate).getTime() < Date.now()
        : false;
      const isGold = !!(data?.data?.subscription && !isExpired);

      try {
        localStorageManager.set(StorageKey.IS_GOLD, isGold);
        if (data) {
          localStorageManager.set(StorageKey.SUBSCRIPTION_DATA, data);
        }
      } catch {}

      set({
        isGold,
        subscriptionData: data,
      });
    },
    clearSubscription: () => {
      try {
        localStorageManager.remove(StorageKey.IS_GOLD);
        localStorageManager.remove(StorageKey.SUBSCRIPTION_DATA);
      } catch {}

      set({
        isGold: false,
        subscriptionData: null,
      });
    },
  };
});
