/**
 * useOtpPaste Hook
 * 
 * Reusable hook for handling OTP paste functionality
 * Extracts digits from pasted text and fills OTP inputs
 * 
 * Usage:
 * const handlePaste = useOtpPaste({ setDigit, setActiveIndex, setError, otpLength });
 * <input onPaste={handlePaste} />
 */

import { useCallback } from "react";
import { REGEX } from "@/lib/constants/regex";
import { logger } from "@/lib/logger/logger";
import { appConfig } from "@/lib/config/app.config";

interface UseOtpPasteProps {
  setDigit: (index: number, value: string) => void;
  setActiveIndex: (index: number) => void;
  setError: (error: null) => void;
  otpLength?: number;
}

export function useOtpPaste({
  setDigit,
  setActiveIndex,
  setError,
  otpLength = appConfig.OTP_LENGTH
}: UseOtpPasteProps) {
  return useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();

      // Get pasted text
      const pastedText = e.clipboardData?.getData("text");

      if (!pastedText) {
        logger.warn("[OTP Paste] No text in clipboard");
        return;
      }

      // Extract only digits from pasted text
      const pastedDigits = pastedText.replace(REGEX.NON_DIGIT, "");

      if (!pastedDigits) {
        logger.warn("[OTP Paste] Pasted text contains no digits", { pastedText });
        return;
      }

      logger.info("[OTP Paste] Processing pasted OTP", { 
        originalLength: pastedText.length,
        digitsLength: pastedDigits.length 
      });

      // Fill OTP boxes with pasted digits (up to OTP length)
      const digitsToFill = pastedDigits.slice(0, otpLength).split("");

      digitsToFill.forEach((digit, i) => {
        setDigit(i, digit);
      });

      // Move focus to last filled box
      const lastIndex = Math.min(digitsToFill.length - 1, otpLength - 1);
      setActiveIndex(lastIndex);

      // Clear any previous errors
      setError(null);

      logger.info("[OTP Paste] Auto-filled from paste", {
        filled: digitsToFill.length,
        complete: digitsToFill.length === otpLength
      });
    },
    [setDigit, setActiveIndex, setError, otpLength]
  );
}
