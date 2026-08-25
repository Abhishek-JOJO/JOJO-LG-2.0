"use client";

import { ErrorKey } from "@/enums/ui.enum";
import { appConfig } from "@/lib/config/app.config";
import { logger } from "@/lib/logger/logger";
import { INITIAL_FOR_OTP } from "@/lib/utils";
import { OtpState } from "@/types/global.types";
import { create } from "zustand";

// Extended OTP state to include auth context
interface OtpAuthContext {
  phone?: string;
  email?: string;
  phoneCode?: string;
  isRegister: boolean;
}

interface ExtendedOtpState extends OtpState {
  authContext: OtpAuthContext;
  setAuthContext: (context: OtpAuthContext) => void;
  resetDigits: () => void;
}

// Helper to get initial auth context from sessionStorage
const getInitialAuthContext = (): OtpAuthContext => {
  if (typeof window === 'undefined') {
    return { isRegister: false };
  }

  try {
    const stored = sessionStorage.getItem('otp-auth-context');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('[OTP Store] Failed to parse stored auth context', { error });
  }

  return { isRegister: false };
};

export const useOtpStore = create<ExtendedOtpState>((set, get) => ({
  ...INITIAL_FOR_OTP,
  authContext: getInitialAuthContext(),

  setAuthContext: (authContext) => {
    // Persist to sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('otp-auth-context', JSON.stringify(authContext));
        logger.info('[OTP Store] Auth context saved to sessionStorage', { authContext });
      } catch (error) {
        logger.error('[OTP Store] Failed to save auth context', { error });
      }
    }
    set({ authContext });
  },

  setDigit: (index, value) => {
    const digits = [...get().digits];
    digits[index] = value.slice(-1); // keep only last char
    const canSubmit = digits.every((d) => d !== "");
    set({ digits, canSubmit, error: null });
  },

  setActiveIndex: (activeIndex) => set({ activeIndex }),

  setError: (error) => set({ error, touched: true }),

  startCountdown: () => set({ countdown: appConfig.RESEND_SECONDS }),

  tickCountdown: () => {
    const { countdown } = get();
    if (countdown > 0) set({ countdown: countdown - 1 });
  },

  submitOtp: (onSuccess) => {
    const { digits } = get();
    const otp = digits.join("");
    if (otp.length < appConfig.OTP_LENGTH) {
      set({ error: ErrorKey.REQUIRED, touched: true });
      return;
    }
    // TODO: call verify OTP API
    logger.info("[OTP Store] Verifying OTP", { otp });
    onSuccess();
  },

  reset: () => {
    // Clear sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('otp-auth-context');
        logger.info('[OTP Store] Auth context cleared from sessionStorage');
      } catch (error) {
        logger.error('[OTP Store] Failed to clear auth context', { error });
      }
    }
    set({
      ...INITIAL_FOR_OTP,
      authContext: { isRegister: false }
    });
  },

  // Reset only OTP digits, keep auth context intact
  resetDigits: () => {
    set({
      ...INITIAL_FOR_OTP,
      authContext: get().authContext // Preserve auth context
    });
  },
}));

export const OTP_LENGTH_CONST = appConfig.OTP_LENGTH;