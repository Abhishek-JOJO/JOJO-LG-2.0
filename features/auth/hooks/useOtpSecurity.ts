/**
 * OTP Security Hook
 * 
 * Provides rate limiting and brute force protection for OTP verification
 * 
 * Features:
 * - Configurable max attempts before lockout
 * - Automatic lockout with countdown timer
 * - Persistent state across page reloads (sessionStorage)
 * - Auto-unlock after lockout duration
 * 
 * @example
 * const security = useOtpSecurity({ maxAttempts: 5, lockoutDuration: 5 * 60 * 1000 });
 * 
 * // Before submission
 * if (!security.canAttempt()) {
 *   showError(`Locked for ${security.getRemainingLockTime()}s`);
 *   return;
 * }
 * 
 * // After failure
 * security.recordFailedAttempt();
 * 
 * // After success
 * security.recordSuccessfulAttempt();
 */

import { useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger/logger";

interface UseOtpSecurityConfig {
  maxAttempts?: number;
  lockoutDuration?: number; // milliseconds
  storageKey?: string;
}

interface SecurityState {
  attempts: number;
  lockUntil: number | null; // timestamp
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STORAGE_KEY = "otp_security_state";

export function useOtpSecurity({
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  lockoutDuration = DEFAULT_LOCKOUT_DURATION,
  storageKey = DEFAULT_STORAGE_KEY,
}: UseOtpSecurityConfig = {}) {
  // Load initial state from sessionStorage
  const getInitialState = (): SecurityState => {
    if (typeof window === "undefined") {
      return { attempts: 0, lockUntil: null };
    }

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as SecurityState;

        // Check if lock has expired
        if (parsed.lockUntil && Date.now() >= parsed.lockUntil) {
          return { attempts: 0, lockUntil: null };
        }

        return parsed;
      }
    } catch (error) {
      logger.error("[OTP Security] Failed to parse stored state", { error });
    }

    return { attempts: 0, lockUntil: null };
  };

  const [state, setState] = useState<SecurityState>(getInitialState);
  const [remainingTime, setRemainingTime] = useState(0);
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Persist state to sessionStorage
  const persistState = (newState: SecurityState) => {
    if (typeof window === "undefined") return;

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(newState));
    } catch (error) {
      logger.error("[OTP Security] Failed to persist state", { error });
    }
  };

  // Update countdown timer
  useEffect(() => {
    if (state.lockUntil && Date.now() < state.lockUntil) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((state.lockUntil! - Date.now()) / 1000));
        setRemainingTime(remaining);

        if (remaining > 0) {
          countdownRef.current = setTimeout(updateCountdown, 1000);
        } else {
          // Auto-unlock
          setState({ attempts: 0, lockUntil: null });
          persistState({ attempts: 0, lockUntil: null });
          logger.info("[OTP Security] Auto-unlocked after lockout period");
        }
      };

      updateCountdown();

      return () => {
        if (countdownRef.current) {
          clearTimeout(countdownRef.current);
        }
      };
    } else {
      setRemainingTime(0);
    }
  }, [state.lockUntil]);

  const recordFailedAttempt = () => {
    const newAttempts = state.attempts + 1;

    logger.warn("[OTP Security] Failed attempt recorded", {
      attempt: newAttempts,
      maxAttempts,
      remaining: maxAttempts - newAttempts,
    });

    if (newAttempts >= maxAttempts) {
      const lockUntilTime = Date.now() + lockoutDuration;
      const newState = { attempts: newAttempts, lockUntil: lockUntilTime };

      setState(newState);
      persistState(newState);

      logger.error("[OTP Security] Account locked due to too many attempts", {
        lockUntil: new Date(lockUntilTime).toISOString(),
        durationMinutes: lockoutDuration / 60000,
      });
    } else {
      const newState = { ...state, attempts: newAttempts };
      setState(newState);
      persistState(newState);
    }
  };

  const recordSuccessfulAttempt = () => {
    const newState = { attempts: 0, lockUntil: null };
    setState(newState);
    persistState(newState);

    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
    }

    logger.info("[OTP Security] Successful attempt - state reset");
  };

  const getRemainingLockTime = (): number => {
    return remainingTime;
  };

  const canAttempt = (): boolean => {
    if (!state.lockUntil) return true;

    // Check if lock has expired
    if (Date.now() >= state.lockUntil) {
      setState({ attempts: 0, lockUntil: null });
      persistState({ attempts: 0, lockUntil: null });
      return true;
    }

    return false;
  };

  const reset = () => {
    const newState = { attempts: 0, lockUntil: null };
    setState(newState);
    persistState(newState);

    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
    }

    logger.info("[OTP Security] Manual reset");
  };

  return {
    attempts: state.attempts,
    maxAttempts,
    isLocked: state.lockUntil !== null && Date.now() < state.lockUntil,
    lockUntil: state.lockUntil,
    remainingTime,
    recordFailedAttempt,
    recordSuccessfulAttempt,
    getRemainingLockTime,
    canAttempt,
    reset,
    // Helper for UI
    attemptsRemaining: Math.max(0, maxAttempts - state.attempts),
  };
}
