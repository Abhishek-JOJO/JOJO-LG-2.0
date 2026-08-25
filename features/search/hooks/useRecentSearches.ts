import { useState, useCallback, useEffect } from "react";
import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import { useProfileStore } from "@store/useProfileStore";

const MAX_RECENT = 10;

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>([]);
  const selectedProfile = useProfileStore((s) => s.selectedProfile);
  const profileId = selectedProfile?.profile_id || "guest";
  const storageKey = `${StorageKey.RECENT_SEARCHES}_${profileId}` as StorageKey;

  // Load from localStorage whenever the active profileId (and thus storageKey) changes
  useEffect(() => {
    const stored = localStorageManager.get<string[]>(storageKey);
    if (Array.isArray(stored)) {
      setRecents(stored);
    } else {
      setRecents([]);
    }
  }, [storageKey]);

  const addRecent = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setRecents((prev) => {
      // Put the new term at the front, remove duplicates, cap at MAX_RECENT
      const updated = [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
      localStorageManager.set(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  const removeRecent = useCallback((query: string) => {
    setRecents((prev) => {
      const updated = prev.filter((s) => s !== query);
      localStorageManager.set(storageKey, updated);
      return updated;
    });
  }, [storageKey]);

  const clearAll = useCallback(() => {
    localStorageManager.set(storageKey, []);
    setRecents([]);
  }, [storageKey]);

  return { recents, addRecent, removeRecent, clearAll };
}
