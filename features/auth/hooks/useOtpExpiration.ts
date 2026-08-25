/**
 * OTP Expiration Hook
 * 
 * Tracks OTP expiration time and provides warnings
 * 
 * Features:
 * - Countdown timer from OTP send time
 * - Warning threshold (e.g., last 60 seconds)
 * - Expired state detection
 * - Manual reset on OTP resend
 * 
 * @example
 * const expiration = useOtpExpiration({ expirationMinutes: 5, warningThresholdSeconds: 60 });
 * 
 * // Check before submission
 * if (expiration.isExpired) {
 *   showError("OTP expired");
 *   return;
 * }
 * 
 * // Reset on resend
 * expiration.reset();
 * 
 * // Show warning in UI
 * {expiration.showWarning && <div>Expires in {expiration.formattedTime}</div>}
 */

import { useState, useEffect, useRef } from "react";
import { formatTime } from "@/lib/utils";
import { logger } from "@/lib/logger/logger";

interface UseOtpExpirationConfig {
  expirationMinutes?: number;
  warningThresholdSeconds?: number;
  autoStart?: boolean;
}

const DEFAULT_EXPIRATION_MINUTES = 5;
const DEFAULT_WARNING_THRESHOLD = 60; // seconds

export function useOtpExpiration({
  expirationMinutes = DEFAULT_EXPIRATION_MINUTES,
  warningThresholdSeconds = DEFAULT_WARNING_THRESHOLD,
  autoStart = true,
}: UseOtpExpirationConfig = {}) {
  const totalSeconds = expirationMinutes * 60;
  
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const [isExpired, setIsExpired] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [isActive, setIsActive] = useState(autoStart);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        const newValue = prev - 1;

        if (newValue <= 0) {
          setIsExpired(true);
          setShowWarning(false);
          setIsActive(false);
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          
          logger.warn("[OTP Expiration] OTP has expired", {
            expirationMinutes,
          });
          
          return 0;
        }

        // Show warning in last N seconds
        if (newValue <= warningThresholdSeconds && !showWarning) {
          setShowWarning(true);
          logger.info("[OTP Expiration] Warning threshold reached", {
            secondsRemaining: newValue,
          });
        }

        return newValue;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, warningThresholdSeconds, expirationMinutes, showWarning]);

  const reset = () => {
    setSecondsRemaining(totalSeconds);
    setIsExpired(false);
    setShowWarning(false);
    setIsActive(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    logger.info("[OTP Expiration] Timer reset", {
      expirationMinutes,
    });
  };

  const pause = () => {
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const resume = () => {
    if (!isExpired && secondsRemaining > 0) {
      setIsActive(true);
    }
  };

  const getProgress = (): number => {
    return (secondsRemaining / totalSeconds) * 100;
  };

  return {
    secondsRemaining,
    isExpired,
    showWarning,
    isActive,
    formattedTime: formatTime(secondsRemaining),
    progress: getProgress(),
    reset,
    pause,
    resume,
  };
}
