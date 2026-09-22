"use client";

import { PageBackground } from "@/components/common/PageBackground";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { JOJOCustomInput } from "@/components/ui/JOJOInput";
import { ErrorKey, LoginIdentifierType, OtpDeliveryMethod } from "@/enums/ui.enum";
import { appConfig } from "@/lib/config/app.config";
import { LOGOS } from "@/lib/constants/assets";
import { REGEX } from "@/lib/constants/regex";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";
import { cn, formatTime } from "@/lib/utils";
import { themeColors } from "@/tailwind.config";
import { useResendOtp, useVerifyOtp } from "@features/auth/hooks/useOtpLogin";
import { useOtpPaste } from "@features/auth/hooks/useOtpPaste";
import { useOtpExpiration } from "@features/auth/hooks/useOtpExpiration";
import { useOtpSecurity } from "@features/auth/hooks/useOtpSecurity";
import { secureLogger } from "@features/auth/utils/secureLogger";
import { mapErrorToKey } from "@/lib/error/errorMapper";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChangeEvent, CSSProperties, KeyboardEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useOtpStore } from "./store";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { tvNavigate } from "@/src/navigation/tvNavigate";
import { useAuthStore } from "@/store/useAuthStore";
import { useVerifySubscription } from "@/hooks/useVerifySubscription";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { doesFocusableExist } from "@noriginmedia/norigin-spatial-navigation";
import { useProfileStore } from "@/store/useProfileStore";

export default function OtpPage() {
  return (
    <Suspense>
      <OtpPageContent />
    </Suspense>
  );
}

function OtpPageContent() {

  const [digits, setDigits] = useState<string[]>(Array(appConfig.OTP_LENGTH).fill(""));
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [touched, setTouched] = useState(false);
  const [countdown, setCountdown] = useState(appConfig.RESEND_SECONDS);

  const t = useTranslations("otpPage");
  const router = useRouter();
  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();
  const authContext = useOtpStore(state => state.authContext);
  const resetOtpStore = useOtpStore(state => state.reset);
  const { isAppReady } = useBootstrap();
  const sessionId = useAuthStore(state => state.token);
  const clearSelectedProfile = useProfileStore(state => state.clearSelectedProfile);
  const { data: subData } = useVerifySubscription(appConfig.GEO_DEFAULT_COUNTRY_CODE, sessionId, isAppReady);
  const isGoldLogo = !!(subData?.data?.subscription?.dEndDate && new Date(subData.data.subscription.dEndDate).getTime() >= Date.now());

  // Security & expiration hooks
  const otpExpiration = useOtpExpiration({ expirationMinutes: 5, warningThresholdSeconds: 60 });
  const otpSecurity = useOtpSecurity({ maxAttempts: 5, lockoutDuration: 5 * 60 * 1000 });

  // Get data from store instead of URL params
  const phone = authContext.phone ?? "";
  const phoneCode = authContext.phoneCode ?? LoginIdentifierType.PHONE_CODE_NUMBER_DEFAULT;

  const email = authContext.email ?? "";
  const isRegister = authContext.isRegister;
  const identifier = phone || email;
  const isEmail = !!email && !phone;

  useEffect(() => {
    // Don't redirect if we just successfully verified OTP and are navigating away
    if (!identifier && !isVerifiedRef.current) {
      logger.warn("[OTP] Unauthorized access - no phone/email provided, redirecting to login");
      tvNavigate(ROUTES.LOGIN, router, { replace: true });
    }
  }, [identifier, router]);

  const canSubmitOtp = digits.every((d) => d !== "");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const isSubmittingRef = useRef(false);
  const isVerifiedRef = useRef(false);
  const lastAttemptedOtpRef = useRef<string | null>(null);

  // Intercept LG remote Back key (keyCode 461 / "GoBack" / "Escape") and navigate back to login
  useEffect(() => {
    const handleBackKey = (e: globalThis.KeyboardEvent) => {
      const isBack = (e as any).keyCode === 461 || e.key === "GoBack" || e.key === "Escape";
      if (isBack) {
        e.preventDefault();
        e.stopPropagation();
        tvNavigate(ROUTES.LOGIN, router);
      }
    };

    window.addEventListener("keydown", handleBackKey, true);
    return () => {
      window.removeEventListener("keydown", handleBackKey, true);
    };
  }, [router]);

  // Initialize on mount
  useEffect(() => {
    setDigits(Array(appConfig.OTP_LENGTH).fill(""));
    setActiveIndex(0);
    setError(null);
    setTouched(false);
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
      setFocus('otp-input-0');
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // WebOTP API - Auto-fetch OTP from SMS
  useEffect(() => {
    let abortController: AbortController | null = null;

    if ("OTPCredential" in window && typeof navigator !== "undefined") {
      abortController = new AbortController();

      // Delay to ensure SMS handler is ready
      const webOtpTimer = setTimeout(() => {
        navigator.credentials
          .get({
            otp: { transport: ["sms"] },
            signal: abortController!.signal,
          } as any)
          .then((otp: any) => {
            if (otp && otp.code) {
              const codeString = String(otp.code).trim();
              const otpDigits = codeString.slice(0, appConfig.OTP_LENGTH).split("");

              // Auto-fill all digits using setDigits directly
              setDigits(prev => {
                const newDigits = [...prev];
                otpDigits.forEach((digit, index) => {
                  if (index < appConfig.OTP_LENGTH) {
                    newDigits[index] = digit;
                  }
                });
                return newDigits;
              });

              secureLogger.debug("[WebOTP] OTP auto-fetched from SMS", {
                length: codeString.length,
              });
            }
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              secureLogger.debug("[WebOTP] Failed to fetch OTP", { error: err.message });
            }
          });
      }, 250);

      return () => {
        clearTimeout(webOtpTimer);
        if (abortController) {
          abortController.abort();
        }
      };
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  // Focus active input
  useEffect(() => {
    const input = inputRefs.current[activeIndex];
    if (input) {
      input.focus();
      input.setSelectionRange(0, input.value.length);
    }
  }, [activeIndex])

  // OTP Handlers
  const setDigit = useCallback((index: number, value: string) => {
    setDigits(prev => {
      const newDigits = [...prev];
      newDigits[index] = value.slice(-1);
      return newDigits;
    });
    setError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          setDigit(index, "");
        } else if (index > 0) {
          setDigit(index - 1, "");
          setActiveIndex(index - 1);
        }
      }
      if (e.key === "ArrowLeft" && index > 0) setActiveIndex(index - 1);
      if (e.key === "ArrowRight" && index < appConfig.OTP_LENGTH - 1) setActiveIndex(index + 1);
    },
    [digits, setDigit]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>, index: number) => {
      const raw = e.target.value.replace(REGEX.NON_DIGIT, "");
      if (!raw) return;

      if (raw.length > 1) {
        // Full OTP autofilled or pasted on any input box
        raw.slice(0, appConfig.OTP_LENGTH).split("").forEach((ch, i) => setDigit(i, ch));
        setActiveIndex(Math.min(raw.length - 1, appConfig.OTP_LENGTH - 1));
        return;
      }

      const char = raw.slice(-1);
      setDigit(index, char);
      if (index < appConfig.OTP_LENGTH - 1) setActiveIndex(index + 1);
    },
    [setDigit, setActiveIndex]
  );

  // Use the reusable OTP paste hook
  const handlePaste = useOtpPaste({
    setDigit,
    setActiveIndex,
    setError: () => setError(null),
    otpLength: appConfig.OTP_LENGTH
  });

  const handleOtpSubmit = useCallback(
    async (e?: any) => {
      if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
      }

      const otp = digits.join("");

      if (otp.length < appConfig.OTP_LENGTH) {
        setError(null);
        setTouched(false);
        const firstEmptyIndex = digits.findIndex((digit) => !digit);
        if (firstEmptyIndex >= 0) {
          setActiveIndex(firstEmptyIndex);
        }
        return;
      }

      if (!identifier) {
        return;
      }

      // Security check: Rate limiting
      if (!otpSecurity.canAttempt()) {
        const remainingTime = otpSecurity.getRemainingLockTime();
        secureLogger.logSecurityEvent("OTP submission blocked - rate limit", {
          attemptsRemaining: otpSecurity.attemptsRemaining,
          lockedFor: remainingTime,
        });
        return;
      }

      // Security check: OTP expiration
      if (otpExpiration.isExpired) {
        setError(ErrorKey.ERR_EXPIRED);
        setTouched(true);
        secureLogger.logSecurityEvent("OTP submission blocked - expired", {
          identifier: isEmail ? email : phone,
        });
        return;
      }

      // Clear any previous errors before attempting verification
      setError(null);
      setTouched(false);

      // Reset React Query mutation state to prevent error flash
      verifyOtp.reset();

      try {
        // Call verify OTP API with isRegister flag
        const response = await verifyOtp.mutateAsync({
          phone: identifier,
          phoneCode: isEmail ? "" : phoneCode,
          otp,
          isRegister,
        });

        isVerifiedRef.current = true; // Mark as verified to block any auto-submits during navigation transition

        // Success - reset security state
        otpSecurity.recordSuccessfulAttempt();
        clearSelectedProfile();
        secureLogger.logOtpAttempt(true, {
          identifier: isEmail ? email : phone,
          isRegister,
        });

        // Navigate FIRST before resetting store.
        // resetOtpStore() clears authContext (email/phone → ""), which would trigger
        // the identifier-empty guard to redirect back to /login — racing against
        // the intended navigation. Push route first, then clean up.
        if (isRegister) {
          const param = phone
            ? `${LoginIdentifierType.PHONE}=${encodeURIComponent(phone)}`
            : `${LoginIdentifierType.EMAIL}=${encodeURIComponent(email)}`;
          tvNavigate(`${ROUTES.REGISTER_CREATE_ACCOUNT}?${param}`, router);
        } else {
          tvNavigate(ROUTES.WATCHING, router);
        }

        // Clear sessionStorage and reset store AFTER navigation is initiated
        resetOtpStore();
      } catch (err) {
        // Failure - record failed attempt
        otpSecurity.recordFailedAttempt();
        secureLogger.logOtpAttempt(false, {
          identifier: isEmail ? email : phone,
          isRegister,
          attempts: otpSecurity.attempts + 1,
          maxAttempts: otpSecurity.maxAttempts,
        });

        const mappedError = mapErrorToKey(err);
        setError(mappedError);
        setTouched(true);
        // remove active/focus state so error styling is visible on all boxes
        try {
          inputRefs.current.forEach((el) => el?.blur());
        } catch (e) {
          /* ignore */
        }
        setActiveIndex(-1);
        secureLogger.logSensitiveError('OTP Page', err, {
          identifier: isEmail ? email : phone,
        });
      }
    },
    [clearSelectedProfile, digits, identifier, isEmail, phoneCode, isRegister, verifyOtp, router, otpSecurity, otpExpiration, phone, email, resetOtpStore]
  );

  // Auto-submit OTP when all digits are entered (with race condition guard)
  useEffect(() => {
    const otp = digits.join("");

    if (
      otp.length === appConfig.OTP_LENGTH &&
      otp !== lastAttemptedOtpRef.current &&
      !isSubmittingRef.current &&
      !verifyOtp.isPending &&
      !verifyOtp.isSuccess &&
      !isVerifiedRef.current
    ) {
      isSubmittingRef.current = true;
      lastAttemptedOtpRef.current = otp;

      // Small delay to allow the last entered digit to paint before verifying.
      const timer = setTimeout(() => {
        if (!verifyOtp.isPending && !isVerifiedRef.current) {
          handleOtpSubmit();
        }
        isSubmittingRef.current = false;
      }, 150);

      return () => {
        clearTimeout(timer);
        isSubmittingRef.current = false;
      };
    }
  }, [digits, handleOtpSubmit, verifyOtp.isPending, verifyOtp.isSuccess]);

  const handleResend = async (method: OtpDeliveryMethod.SMS | OtpDeliveryMethod.CALL) => {
    if (countdown > 0) return;

    if (!identifier) {
      secureLogger.logSensitiveError("OTP Resend", new Error("No identifier"));
      return;
    }

    try {
      secureLogger.logOtpResend({
        method,
        identifier: isEmail ? email : phone,
        isEmail,
      });

      await resendOtp.mutateAsync({
        phone: identifier,
        phoneCode: isEmail ? "" : phoneCode
      });

      // Reset all timers and states
      setCountdown(appConfig.RESEND_SECONDS);
      setDigits(Array(appConfig.OTP_LENGTH).fill(""));
      setActiveIndex(0);
      setError(null);
      setTouched(false);
      isVerifiedRef.current = false; // Reset verification block ref
      lastAttemptedOtpRef.current = null; // Reset last attempted OTP

      // Reset expiration timer
      otpExpiration.reset();

      secureLogger.logOtpResend({
        success: true,
        identifier: isEmail ? email : phone,
      });
    } catch (err) {
      secureLogger.logSensitiveError("OTP Resend", err, {
        identifier: isEmail ? email : phone,
      });
      const mappedError = mapErrorToKey(err);
      setError(mappedError);
      setTouched(true);
    }
  };

  const hasError = !!(error && touched);

  const boxClass = cn(
    "w-full h-12 rounded-full text-center text-2xl font-bold outline-none caret-transparent",
    "bg-theme_10 text-theme_1 transition-[border-color,box-shadow] duration-150",
    "border-0"
  );

  const boxStyle = (i: number): CSSProperties => ({
    // Priority: active/focused > error > default
    border: activeIndex === i ? "1px solid var(--theme_13_samecolour)" : (hasError ? "1px solid var(--theme_14_samecolour)" : "none"),
  });

  const isDisabled = countdown > 0 || resendOtp.isPending || otpSecurity.isLocked;
  const canFocusResend = !isDisabled && countdown <= 0;

  // Display value for UI
  const displayIdentifier = isEmail
    ? email
    : `${phoneCode} ${phone}`;

  // ── Focus setup for submit button ─────────────────────────────────────────
  const { ref: submitRef, focused: submitFocused } = useFocusable({
    focusKey: 'otp-submit',
    onEnterPress: () => {
      if (canSubmitOtp && !verifyOtp.isPending && !otpSecurity.isLocked && !otpExpiration.isExpired) {
        submitButtonRef.current?.click();
      }
    },
    onArrowPress: (direction) => {
      if (direction === 'up') {
        if (canFocusResend && doesFocusableExist('otp-resend')) {
          setFocus('otp-resend');
        } else {
          setFocus('otp-input-0');
          inputRefs.current[0]?.focus();
        }
        return false;
      }
      return true;
    }
  });

  const { ref: resendRef, focused: resendFocused } = useFocusable({
    focusKey: 'otp-resend',
    onEnterPress: () => {
      if (!isDisabled) handleResend(OtpDeliveryMethod.SMS);
    },
    onArrowPress: (direction) => {
      if (direction === 'up') {
        setFocus('otp-input-0');
        inputRefs.current[0]?.focus();
        return false;
      }
      if (direction === 'down') {
        setFocus('otp-submit');
        return false;
      }
      return true;
    }
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PageBackground />
      <div className="relative z-10 flex min-h-screen flex-col px-6 py-8 sm:px-10">
        {/* Top bar: logo */}
        <div className="flex items-center">
          <JOJOCommonImage
            src={isGoldLogo ? LOGOS.JOJO_GOLD : LOGOS.JOJO_LOGO}
            altKey="img_jojo_logo"
            width={isGoldLogo ? 180 : 110}
            height={isGoldLogo ? 70 : 40}
            preset={JOJOImagePreset.Logo}
            wrapperClassName={isGoldLogo ? "h-[70px] w-[180px] justify-self-start" : "h-9 w-[110px] justify-self-start"}
          />
        </div>

        <div className="flex flex-1 items-start justify-center px-4 pt-14 sm:pt-16">
        <form onSubmit={handleOtpSubmit as any} noValidate className="w-full max-w-sm sm:max-w-md">
            <div className="flex flex-col items-center text-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-theme_1">
                {isRegister ? t("verify_registration") : t("title_login")}
              </h1>
              <p className="body-md-regular text-theme_5">
                <span className="mr-1">{isEmail ? t("sent_to_email") : t("sent_to")}</span>
                <span className="body-md-regular break-all text-theme_1">{` ${displayIdentifier}`}</span>
              </p>
            </div>

            <div className="flex flex-col gap-0 pt-5" style={{ gap: "10px" }}>
              {/* OTP boxes */}
              <div className="grid gap-3 w-full pt-3" style={{ gridTemplateColumns: `repeat(${appConfig.OTP_LENGTH}, 1fr)` }}>
                {Array.from({ length: appConfig.OTP_LENGTH }).map((_, i) => (
                  <FocusableOtpInput
                    key={i}
                    index={i}
                    digit={digits[i]}
                    activeIndex={activeIndex}
                    hasError={hasError}
                    handleChange={handleChange}
                    handleKeyDown={handleKeyDown}
                    handlePaste={handlePaste}
                    setActiveIndex={setActiveIndex}
                    t={t}
                    inputRefs={inputRefs}
                    boxClass={boxClass}
                    boxStyle={boxStyle}
                    canFocusResend={canFocusResend}
                  />
                ))}
              </div>

              {/* Error */}
              {!otpSecurity.isLocked && error && touched && !verifyOtp.isPending && (
                <div role="alert" className="text-sm leading-snug text-theme_14_samecolour flex items-center gap-2">
                  <JOJOCommonImage
                    src={LOGOS.ERROR_ICON}
                    altKey="img_jojo_logo"
                    width={14}
                    height={14}
                    preset={JOJOImagePreset.Logo}
                    wrapperClassName="size-3.5 flex-shrink-0"
                  />
                  {t(error as any)}
                </div>
              )}

              {/* Rate Limit Warning */}
              {otpSecurity.isLocked && (
                <div role="alert" className="text-sm leading-snug text-theme_14_samecolour flex items-center gap-2 mt-2">
                  <JOJOCommonImage
                    src={LOGOS.ERROR_ICON}
                    altKey="img_jojo_logo"
                    width={14}
                    height={14}
                    preset={JOJOImagePreset.Logo}
                    wrapperClassName="size-3.5 flex-shrink-0"
                  />
                  {t("too_many_attempts_lockout", { time: formatTime(otpSecurity.getRemainingLockTime()) })}
                </div>
              )}

              {/* Attempts Remaining (show when > 0 attempts but not locked) */}
              {!otpSecurity.isLocked && otpSecurity.attempts > 0 && (
                <div className="text-sm leading-snug text-orange-500 flex items-center gap-2 mt-2">
                  ⚠️ {t("attempts_remaining", { count: otpSecurity.attemptsRemaining })}
                </div>
              )}

              {/* Expiration Warning */}
              {!otpSecurity.isLocked && otpExpiration.showWarning && !otpExpiration.isExpired && (
                <div className="text-sm leading-snug text-orange-500 flex items-center gap-2 mt-2">
                  {t("otp_expires_in", { time: otpExpiration.formattedTime })}
                </div>
              )}

              {/* Expiration Error */}
              {!otpSecurity.isLocked && otpExpiration.isExpired && (
                <div role="alert" className="text-sm leading-snug text-theme_14_samecolour flex items-center gap-2 mt-2">
                  <JOJOCommonImage
                    src={LOGOS.ERROR_ICON}
                    altKey="img_jojo_logo"
                    width={14}
                    height={14}
                    preset={JOJOImagePreset.Logo}
                    wrapperClassName="size-3.5 flex-shrink-0"
                  />
                  {t("otp_expired_msg")}
                </div>
              )}

              {/* Resend */}
              <div className="flex flex-col items-center w-full text-center py-5">
                <div className="m-0 flex min-h-[48px] items-center justify-center text-sm text-theme_5">
                  {countdown > 0 && !otpSecurity.isLocked ? (
                    <>{t("resend_in")} <span className="text-theme_13_samecolour font-semibold tabular-nums">{formatTime(countdown)}</span></>
                  ) : (
                    <button
                      ref={resendRef as any}
                      type="button"
                      tabIndex={isDisabled ? -1 : 0}
                      aria-disabled={isDisabled}
                      onClick={() => { if (!isDisabled) handleResend(OtpDeliveryMethod.SMS); }}
                      onKeyDown={(e) => { if (!isDisabled && (e.key === "Enter" || e.key === " ")) handleResend(OtpDeliveryMethod.SMS); }}
                      className={cn(
                        "body-sm-medium min-w-[220px] rounded-full border px-8 py-3 transition-all duration-150 outline-none",
                        isDisabled
                          ? "cursor-not-allowed border-white/10 bg-white/5 text-white/35"
                          : "cursor-pointer border-theme_13_samecolour bg-black/40 text-white shadow-lg shadow-black/20",
                        resendFocused ? "scale-110 bg-theme_13_samecolour text-black ring-4 ring-white shadow-2xl ring-offset-2 ring-offset-black" : ""
                      )}
                    >
                      {!isEmail ? t("resend_now_on") : t("resend_now")}
                    </button>
                  )}
                </div>
                {/* {
                  !isEmail && <div className="flex items-center gap-4 pt-2">
                    <div
                      role="button" tabIndex={isDisabled ? -1 : 0} aria-disabled={isDisabled}
                      onClick={() => { if (!isDisabled) handleResend(OtpDeliveryMethod.SMS); }}
                      onKeyDown={(e) => { if (!isDisabled && (e.key === "Enter" || e.key === " ")) handleResend(OtpDeliveryMethod.SMS); }}
                      className={cn("flex items-center body-sm-medium gap-1.5 text-theme_7 transition-colors duration-150 cursor-pointer", isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer text-theme_13_samecolour")}
                    >
                      <MessageSquare
                        className={cn(
                          "w-4 h-4",
                          isDisabled ? "text-theme_7" : "text-theme_13_samecolour"
                        )}
                      />{t("via_sms")}
                    </div>
                    <span className="text-theme_7 select-none" aria-hidden="true">|</span>
                    <div
                      role="button" tabIndex={isDisabled ? -1 : 0} aria-disabled={isDisabled}
                      onClick={() => { if (!isDisabled) handleResend(OtpDeliveryMethod.CALL); }}
                      onKeyDown={(e) => { if (!isDisabled && (e.key === "Enter" || e.key === " ")) handleResend(OtpDeliveryMethod.CALL); }}
                      className={cn("flex items-center body-sm-medium gap-1.5 text-theme_7 transition-colors duration-150 cursor-pointer", isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer text-theme_13_samecolour")}
                    >
                      <PhoneCallIcon
                        className={cn(
                          "w-4 h-4",
                          isDisabled ? "text-theme_7" : "text-theme_13_samecolour"
                        )}
                      />
                      {t("via_call")}
                    </div>
                  </div>
                } */}
              </div>
            </div>

            <div ref={submitRef as any} className={`w-[80%] mx-auto mt-6 rounded-[100px] transition-all ${submitFocused ? "ring-4 ring-white shadow-xl scale-105" : ""}`}>
              <JOJOCustomButton
                ref={submitButtonRef}
                size={JOJOButton.Size.L}
                state={canSubmitOtp && !otpSecurity.isLocked && !otpExpiration.isExpired ? JOJOButton.State.ACTIVE : JOJOButton.State.DISABLED}
                type="submit"
                hoverColor={themeColors.theme_13_samecolour}
                disabled={!canSubmitOtp || verifyOtp.isPending || otpSecurity.isLocked || otpExpiration.isExpired}
                isLoading={verifyOtp.isPending}
                className="rounded-[100px] hover:opacity-90 body-sm-medium mx-auto flex border-none w-full"
              >
                {isRegister ? t("submit_register") : t("submit_login")}
              </JOJOCustomButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FocusableOtpInput({ index, digit, activeIndex, hasError, handleChange, handleKeyDown, handlePaste, setActiveIndex, t, inputRefs, boxClass, boxStyle, canFocusResend }: any) {
  const moveDownFromOtp = useCallback(() => {
    inputRefs.current[index]?.blur();
    if (canFocusResend) {
      setFocus('otp-resend');
    } else {
      setFocus('otp-submit');
    }
  }, [canFocusResend, index, inputRefs]);

  const { ref, focused } = useFocusable({
    focusKey: `otp-input-${index}`,
    onFocus: () => {
      setActiveIndex(index);
      inputRefs.current[index]?.focus();
      inputRefs.current[index]?.setSelectionRange(0, inputRefs.current[index]?.value.length ?? 0);
    },
    onEnterPress: () => {
      inputRefs.current[index]?.focus();
    },
    onArrowPress: (direction) => {
      if (direction === 'left' && index > 0) {
        setFocus(`otp-input-${index - 1}`);
        inputRefs.current[index - 1]?.focus();
        return false;
      }
      if (direction === 'right' && index < appConfig.OTP_LENGTH - 1) {
        setFocus(`otp-input-${index + 1}`);
        inputRefs.current[index + 1]?.focus();
        return false;
      }
      if (direction === 'down') {
        moveDownFromOtp();
        return false;
      }
      if (direction === 'up') {
        setFocus(`otp-input-${index}`);
        inputRefs.current[index]?.focus();
        return false;
      }
      return true;
    }
  });

  return (
    <div
      ref={ref as any}
      className={`rounded-full transition-all ${focused ? "ring-4 ring-white shadow-xl scale-[1.05]" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          moveDownFromOtp();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          e.stopPropagation();
          moveDownFromOtp();
        }
      }}
    >
      <JOJOCustomInput
        ref={(el) => { inputRefs.current[index] = el; }}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete={index === 0 ? "one-time-code" : "off"}
        maxLength={1}
        value={digit}
        onChange={(e) => {
          handleChange(e, index);
          // Auto move focus if moving index
          if (e.target.value && index < appConfig.OTP_LENGTH - 1) {
             setFocus(`otp-input-${index + 1}`);
             inputRefs.current[index + 1]?.focus();
          }
        }}
        onKeyDown={(e) => {
          const isBack = (e as any).keyCode === 461 || e.key === "GoBack" || e.key === "Escape";
          if (isBack) {
            e.preventDefault();
            e.stopPropagation();
            tvNavigate(ROUTES.LOGIN, null);
            return;
          }

          const isDigitKey = /^[0-9]$/.test(e.key);
          const allowedControlKeys = [
            "Backspace",
            "Delete",
            "Tab",
            "Enter",
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ];
          if (!isDigitKey && !allowedControlKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            e.stopPropagation();
            moveDownFromOtp();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocus(`otp-input-${index}`);
            inputRefs.current[index]?.focus();
            return;
          }
          if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            setFocus(`otp-input-${index - 1}`);
            inputRefs.current[index - 1]?.focus();
            return;
          }
          if (e.key === "ArrowRight" && index < appConfig.OTP_LENGTH - 1) {
            e.preventDefault();
            setFocus(`otp-input-${index + 1}`);
            inputRefs.current[index + 1]?.focus();
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLElement)?.blur();
            setFocus('otp-submit');
            return;
          }
          handleKeyDown(e, index);
          // Manually handle spatial focus sync
          if (e.key === "Backspace" && !digit && index > 0) {
            setFocus(`otp-input-${index - 1}`);
            inputRefs.current[index - 1]?.focus();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            e.stopPropagation();
            moveDownFromOtp();
          }
        }}
        onPaste={handlePaste}
        onFocus={() => {
          setActiveIndex(index);
          setFocus(`otp-input-${index}`);
        }}
        aria-label={t("otp_digit", { number: index + 1 })}
        tabIndex={0}
        name={index === 0 ? "one-time-code" : undefined}
        className={cn(
          boxClass,
          "cursor-text caret-theme_13_samecolour",
          activeIndex === index
            ? "ring-0 ring-theme_13_samecolour cursor-text"
            : hasError
              ? "ring-0 ring-theme_14_samecolour"
              : "",
          "focus:outline-none focus:ring-1 focus:ring-theme_13_samecolour"
        )}
        style={boxStyle(index)}
      />
    </div>
  );
}
