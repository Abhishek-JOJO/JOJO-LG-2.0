/**
 * Socket Lock Manager
 * Ensures only ONE active socket per session across multiple tabs
 */

import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import { logger } from "@lib/logger/logger";

interface SocketLock {
  sessionId: string;
  tabId: string;
  timestamp: number;
}

const LOCK_EXPIRY_MS = 15 * 1000; // 15 seconds
let heartbeatInterval: NodeJS.Timeout | null = null;

// Lazy initialization to avoid SSR issues
let TAB_ID: string | null = null;
function getTabId(): string {
  if (!TAB_ID) {
    if (typeof window !== "undefined" && window.sessionStorage) {
      TAB_ID = window.sessionStorage.getItem("SOCKET_TAB_ID");
      if (!TAB_ID) {
        TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        window.sessionStorage.setItem("SOCKET_TAB_ID", TAB_ID);
      }
    } else {
      TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
  return TAB_ID;
}

/**
 * Try to acquire socket lock
 * Returns true if lock acquired, false otherwise
 */
export function tryAcquireLock(sessionId: string): boolean {
  const tabId = getTabId();
  const existingLock = localStorageManager.get<SocketLock>(StorageKey.SOCKET_LOCK);
  
  // No lock exists - acquire it
  if (!existingLock) {
    acquireLock(sessionId);
    logger.info('[Socket Lock] Lock acquired', { tabId, sessionId });
    return true;
  }
  
  // Lock exists for different session - steal it
  if (existingLock.sessionId !== sessionId) {
    acquireLock(sessionId);
    logger.info('[Socket Lock] Lock stolen (different session)', { tabId, sessionId });
    return true;
  }
  
  // Lock exists for same session - check if expired
  const lockAge = Date.now() - existingLock.timestamp;
  if (lockAge > LOCK_EXPIRY_MS) {
    acquireLock(sessionId);
    logger.info('[Socket Lock] Lock stolen (expired)', { tabId, sessionId });
    return true;
  }
  
  // Lock exists for same session and not expired - check if we own it
  if (existingLock.tabId === tabId) {
    logger.info('[Socket Lock] Already own lock', { tabId, sessionId });
    return true;
  }
  
  // Lock owned by another tab
  logger.info('[Socket Lock] Lock owned by another tab', { 
    tabId, 
    ownerTabId: existingLock.tabId,
    sessionId 
  });
  return false;
}

/**
 * Acquire lock for this tab
 */
function acquireLock(sessionId: string): void {
  const lock: SocketLock = {
    sessionId,
    tabId: getTabId(),
    timestamp: Date.now(),
  };
  
  localStorageManager.set(StorageKey.SOCKET_LOCK, lock);
  startHeartbeat(sessionId);
}

function startHeartbeat(sessionId: string): void {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(() => {
    if (ownsLock()) {
      const lock: SocketLock = {
        sessionId,
        tabId: getTabId(),
        timestamp: Date.now(),
      };
      localStorageManager.set(StorageKey.SOCKET_LOCK, lock);
    } else {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }
  }, 5000); // Ping every 5 seconds
}

/**
 * Release lock if owned by this tab
 */
export function releaseLock(): void {
  const tabId = getTabId();
  const existingLock = localStorageManager.get<SocketLock>(StorageKey.SOCKET_LOCK);
  
  if (existingLock && existingLock.tabId === tabId) {
    localStorageManager.remove(StorageKey.SOCKET_LOCK);
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    logger.info('[Socket Lock] Lock released', { tabId });
  }
}

/**
 * Force acquire socket lock (stealing it from any other tab)
 */
export function forceAcquireLock(sessionId: string): void {
  acquireLock(sessionId);
  logger.info('[Socket Lock] Lock force-acquired (stolen)', { tabId: getTabId(), sessionId });
}

/**
 * Check if this tab owns the lock
 */
export function ownsLock(): boolean {
  const existingLock = localStorageManager.get<SocketLock>(StorageKey.SOCKET_LOCK);
  return existingLock?.tabId === getTabId();
}

/**
 * Get current lock info
 */
export function getLockInfo(): SocketLock | null {
  return localStorageManager.get<SocketLock>(StorageKey.SOCKET_LOCK);
}

/**
 * Setup lock cleanup on tab close
 */
export function setupLockCleanup(): void {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('beforeunload', () => {
    releaseLock();
  });
  
  // Also listen to storage events to detect lock changes from other tabs
  window.addEventListener('storage', (event) => {
    if (event.key === StorageKey.SOCKET_LOCK) {
      logger.info('[Socket Lock] Lock changed by another tab');
    }
  });
}
