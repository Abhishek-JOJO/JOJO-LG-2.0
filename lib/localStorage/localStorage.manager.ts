import { StorageKey } from "@enums/storage.enum";
import { logger } from "@lib/logger/logger";

const isClient = typeof window !== "undefined";

export const localStorageManager = {
    get<T>(key: StorageKey): T | null {
        if (!isClient) return null;
        if (!key || String(key) === "undefined") {
            return null;
        }
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    },

    set<T>(key: StorageKey, value: T): void {
        if (!isClient) return;
        if (!key || String(key) === "undefined") {
            logger.warn(`[LocalStorage] Blocked setting undefined key with value:`, value);
            return;
        }
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            logger.warn(`[LocalStorage] Failed to set key: ${key}`, { error });
        }
    },

    remove(key: StorageKey): void {
        if (!isClient) return;
        if (!key || String(key) === "undefined") return;
        localStorage.removeItem(key);
    },

    clear(): void {
        if (!isClient) return;
        localStorage.clear();
    },
};
