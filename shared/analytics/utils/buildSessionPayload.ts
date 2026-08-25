/**
 * Session Payload Builder
 * 
 * Manages session tracking with localStorage persistence
 */

import { ANALYTICS_STORAGE_KEYS } from '../constants/analytics.constants';
import type { SessionContext } from '../model/context.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  const stored = localStorage.getItem(ANALYTICS_STORAGE_KEYS.SESSION_ID);
  if (stored) return stored;
  
  const newId = uuidv4();
  localStorage.setItem(ANALYTICS_STORAGE_KEYS.SESSION_ID, newId);
  localStorage.setItem(ANALYTICS_STORAGE_KEYS.SESSION_START, new Date().toISOString());
  return newId;
}

/**
 * Get session start time
 */
function getSessionStartTime(): string {
  if (typeof window === 'undefined') return new Date().toISOString();
  
  const stored = localStorage.getItem(ANALYTICS_STORAGE_KEYS.SESSION_START);
  if (stored) return stored;
  
  const now = new Date().toISOString();
  localStorage.setItem(ANALYTICS_STORAGE_KEYS.SESSION_START, now);
  return now;
}

/**
 * Calculate session duration in seconds
 */
function getSessionDuration(): number {
  if (typeof window === 'undefined') return 0;
  
  const startTime = getSessionStartTime();
  const start = new Date(startTime).getTime();
  const now = Date.now();
  return Math.floor((now - start) / 1000);
}

/**
 * Build session context payload
 */
export function buildSessionPayload(): SessionContext {
  return {
    session_id: getSessionId(),
    session_start_time: getSessionStartTime(),
    session_duration_seconds: getSessionDuration(),
  };
}

/**
 * Reset session (call on logout)
 */
export function resetSession(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(ANALYTICS_STORAGE_KEYS.SESSION_ID);
  localStorage.removeItem(ANALYTICS_STORAGE_KEYS.SESSION_START);
}
