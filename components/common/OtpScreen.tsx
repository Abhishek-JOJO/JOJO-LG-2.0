"use client";

import { OTP_LENGTH_CONST, useOtpStore } from "@/app/login/otp/store";
import { PageBackground } from "@/components/common/PageBackground";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { JOJOCardContent, JOJOCardDescription, JOJOCardFooter, JOJOCardHeader, JOJOCardTitle, JOJOCustomCard } from "@/components/ui/JOJOCard";
import { JOJOCustomInput } from "@/components/ui/JOJOInput";
import { ErrorKey, LoginIdentifierType, OtpDeliveryMethod, OTPScreenMode } from "@/enums/ui.enum";
import { LOGOS } from "@/lib/constants/assets";
import { REGEX } from "@/lib/constants/regex";
import { ROUTES } from "@/lib/constants/routes";
import { cn, formatTime } from "@/lib/utils";
import { OtpScreenProps } from "@/types/global.types";
import { useResendOtp, useVerifyOtp } from "@features/auth/hooks/useOtpLogin";
import { useOtpPaste } from "@features/auth/hooks/useOtpPaste";
import { useOtpExpiration } from "@features/auth/hooks/useOtpExpiration";
import { useOtpSecurity } from "@features/auth/hooks/useOtpSecurity";
import { secureLogger } from "@features/auth/utils/secureLogger";
import { mapErrorToKey } from "@/lib/error/errorMapper";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChangeEvent, CSSProperties, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import JOJOCommonImage, { JOJOImagePreset } from "../ui/JOJOCommonImage";

export function OtpScreen({ mode }: OtpScreenProps) {
  const t = useTranslations("otpPage");
  const router = useRouter();
  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();

  const {
    digits, activeIndex, error, touched, countdown, canSubmit,
    setDigit, setActiveIndex, setError, startCountdown, tickCountdown,
    resetDigits, authContext,
  } = useOtpStore();

  // Security & expiration hooks
  const otpExpiration = useOtpExpiration({ expirationMinutes: 5, warningThresholdSeconds: 60 });
  const otpSecurity = useOtpSecurity({ maxAttempts: 5, lockoutDuration: 5 * 60 * 1000 });

  // Get identifier from store instead of URL params
  const phone = authContext.phone ?? "";
  const phoneCode = authContext.phoneCode ?? "";
  const email = authContext.email ?? "";
  const identifier = phone || email;
  const isEmail = !!email && !phone;
  const displayIdentifier = isEmail
    ? email
    : `${phoneCode} ${phone}`;

  const isRegister = mode === OTPScreenMode.REGISTER_MODE;

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const isSubmittingRef = useRef(false);
  const isVerifiedRef = useRef(false);
  const lastAttemptedOtpRef = useRef<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    resetDigits();
    setActiveIndex(0);
    const t = setTimeout(() => inputRefs.current[0]?.focus(), 100);
    return () => clearTimeout(t);
  }, [resetDigits, setActiveIndex]);

  // WebOTP API - Auto-fetch OTP from SMS (separate effect)
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
              const otpDigits = codeString.slice(0, OTP_LENGTH_CONST).split("");
              
              // Auto-fill all digits
              otpDigits.forEach((digit, index) => {
                if (index < OTP_LENGTH_CONST) {
                  setDigit(index, digit);
                }
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
  }, [setDigit]);

  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(tickCountdown, 1000);
    return () => clearInterval(id);
  }, [countdown, tickCountdown]);

  useEffect(() => {
    const input = inputRefs.current[activeIndex];
    if (input) { input.focus(); input.setSelectionRange(0, input.value.length); }
  }, [activeIndex]);


  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === "Backspace") {
        if (digits[index]) setDigit(index, "");
        else if (index > 0) { setDigit(index - 1, ""); setActiveIndex(index - 1); }
      }
      if (e.key === "ArrowLeft" && index > 0) setActiveIndex(index - 1);
      if (e.key === "ArrowRight" && index < OTP_LENGTH_CONST - 1) setActiveIndex(index + 1);
    },
    [digits, setDigit, setActiveIndex]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>, index: number) => {
      const raw = e.target.value.replace(REGEX.NON_DIGIT, "");
      if (!raw) return;
      if (raw.length > 1) {
        // Full OTP autofilled or pasted on any input box
        raw.slice(0, OTP_LENGTH_CONST).split("").forEach((ch, i) => setDigit(i, ch));
        setActiveIndex(Math.min(raw.length - 1, OTP_LENGTH_CONST - 1));
        return;
      }
      const char = raw.slice(-1);
      setDigit(index, char);
      if (index < OTP_LENGTH_CONST - 1) setActiveIndex(index + 1);
    },
    [setDigit, setActiveIndex]
  );

  // Use the reusable OTP paste hook
  const handlePaste = useOtpPaste({
    setDigit,
    setActiveIndex,
    setError: () => setError(null),
    otpLength: OTP_LENGTH_CONST
  });

  const handleSubmit = useCallback(
    async (e?: any) => {
      if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
      }

      const otp = digits.join("");

      if (!canSubmit) {
        setError(ErrorKey.REQUIRED);
        return;
      }

      if (!identifier) {
        setError(ErrorKey.ERR_INVALID);
        return;
      }

      // Security check: Rate limiting
      if (!otpSecurity.canAttempt()) {
        const remainingTime = otpSecurity.getRemainingLockTime();
        setError(ErrorKey.ERR_INVALID);
        secureLogger.logSecurityEvent("OTP submission blocked - rate limit", {
          attemptsRemaining: otpSecurity.attemptsRemaining,
          lockedFor: remainingTime,
        });
        return;
      }

      // Security check: OTP expiration
      if (otpExpiration.isExpired) {
        setError(ErrorKey.ERR_EXPIRED);
        secureLogger.logSecurityEvent("OTP submission blocked - expired", {
          identifier: isEmail ? email : phone,
        });
        return;
      }

      // Clear any previous errors before attempting verification
      setError(null);
      
      // Reset React Query mutation state to prevent error flash
      verifyOtp.reset();

      try {
        // Call verify OTP API with isRegister flag
        await verifyOtp.mutateAsync({
          phone: identifier,
          phoneCode: isEmail ? "" : phoneCode,
          otp,
          isRegister
        });

        isVerifiedRef.current = true; // Mark as verified to block any auto-submits during navigation transition
        setIsNavigating(true);

        // Success - reset security state
        otpSecurity.recordSuccessfulAttempt();
        secureLogger.logOtpAttempt(true, {
          identifier: isEmail ? email : phone,
          isRegister,
        });

        // Navigate immediately without delay
        if (isRegister) {
          const param = phone
            ? `${LoginIdentifierType.PHONE}=${encodeURIComponent(phone)}`
            : `${LoginIdentifierType.EMAIL}=${encodeURIComponent(email)}`;
          router.push(`${ROUTES.REGISTER_CREATE_ACCOUNT}?${param}`);
        } else {
          router.push(ROUTES.HOME);
        }
      } catch (err) {
        setIsNavigating(false);
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
        // remove active/focus state so error styling is visible on all boxes
        try {
          inputRefs.current.forEach((el) => el?.blur());
        } catch (e) {
          /* ignore */
        }
        setActiveIndex(-1);
        secureLogger.logSensitiveError('OTP Screen', err, {
          identifier: isEmail ? email : phone,
        });
      }
    },
    [digits, canSubmit, identifier, isEmail, phoneCode, isRegister, phone, email, verifyOtp, router, setError, setActiveIndex, otpSecurity, otpExpiration]
  );

  // Auto-submit OTP when all digits are entered (with race condition guard)
  useEffect(() => {
    const otp = digits.join("");
    
    if (
      otp.length === OTP_LENGTH_CONST && 
      otp !== lastAttemptedOtpRef.current &&
      !isSubmittingRef.current && 
      !verifyOtp.isPending && 
      !verifyOtp.isSuccess && 
      !isVerifiedRef.current
    ) {
      isSubmittingRef.current = true;
      lastAttemptedOtpRef.current = otp;
      
      // Small delay to allow user to see complete OTP before submitting
      const timer = setTimeout(() => {
        if (!verifyOtp.isPending && !isVerifiedRef.current) {
          submitButtonRef.current?.click();
        }
        isSubmittingRef.current = false;
      }, 150);
      
      return () => {
        clearTimeout(timer);
        isSubmittingRef.current = false;
      };
    }
  }, [digits, verifyOtp.isPending, verifyOtp.isSuccess]);



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

      startCountdown();
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
    }
  };

  const isDisabled = countdown > 0 || resendOtp.isPending || otpSecurity.isLocked;

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

  return (
    <div className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
      <PageBackground />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <JOJOCustomCard className="w-full max-w-sm sm:max-w-md " style={{ background: "var(--theme_12_60)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(6px)", }}>
          <form onSubmit={handleSubmit as any} noValidate>
            <JOJOCardHeader>
              <JOJOCardTitle>{isRegister ? t("title_register") : t("title_login")}</JOJOCardTitle>
              <JOJOCardDescription className="mt-10 text-start text-theme_7 w-full body-md-regular overflow-hidden">
                <span className="mr-1">{isEmail ? t("sent_to_email") : t("sent_to")}</span>
                <span className={`body-md-regular break-all max-w-full inline-block ${!isEmail ? 'ml-2' : ''}`}>{` ${displayIdentifier}`}</span>
              </JOJOCardDescription>
            </JOJOCardHeader>

            <JOJOCardContent className="gap-0" style={{ gap: "10px" }}>
              {/* OTP boxes */}
              <div className="grid gap-3 w-full pt-3" style={{ gridTemplateColumns: `repeat(${OTP_LENGTH_CONST}, 1fr)` }}>
                {Array.from({ length: OTP_LENGTH_CONST }).map((_, i) => (
                  <JOJOCustomInput
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={OTP_LENGTH_CONST}
                    value={digits[i]}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onPaste={handlePaste}
                    onFocus={() => setActiveIndex(i)}
                    aria-label={`OTP digit ${i + 1}`}
                    tabIndex={0}
                    name={i === 0 ? "one-time-code" : undefined}
                    className={cn(
                      boxClass,
                      "cursor-text caret-theme_13_samecolour",
                      activeIndex === i
                        ? "ring-0 ring-theme_13_samecolour cursor-text"
                        : hasError
                          ? "ring-0 ring-theme_14_samecolour"
                          : "",
                      "focus:outline-none focus:ring-1 focus:ring-theme_13_samecolour"
                    )}
                    style={boxStyle(i)}
                  />
                ))}
              </div>

              {/* Error */}
              {!otpSecurity.isLocked && error && touched && !verifyOtp.isPending && (
                <div role="alert" className="text-xs text-theme_14_samecolour flex items-center gap-1.5">
                  <JOJOCommonImage
                    src={LOGOS.ERROR_ICON}
                    altKey="img_jojo_logo"
                    width={12}
                    height={12}
                    preset={JOJOImagePreset.Logo}
                    wrapperClassName="size-3 flex-shrink-0"
                  />
                  {t(error as any)}
                </div>
              )}

              {/* Rate Limit Warning */}
              {otpSecurity.isLocked && (
                <div role="alert" className="text-xs text-theme_14_samecolour flex items-center gap-1.5 mt-2">
                  <JOJOCommonImage
                    src={LOGOS.ERROR_ICON}
                    altKey="img_jojo_logo"
                    width={12}
                    height={12}
                    preset={JOJOImagePreset.Logo}
                    wrapperClassName="size-3 flex-shrink-0"
                  />
                  Too many attempts. Try again in {formatTime(otpSecurity.getRemainingLockTime())}
                </div>
              )}

              {/* Attempts Remaining */}
              {!otpSecurity.isLocked && otpSecurity.attempts > 0 && (
                <div className="text-xs text-orange-500 flex items-center gap-1.5 mt-2">
                  ⚠️ {otpSecurity.attemptsRemaining} {otpSecurity.attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining
                </div>
              )}

              {/* Expiration Warning */}
              {!otpSecurity.isLocked && otpExpiration.showWarning && !otpExpiration.isExpired && (
                <div className="text-xs text-orange-500 flex items-center gap-1.5 mt-2">
                  ⏱️ OTP expires in {otpExpiration.formattedTime}
                </div>
              )}

              {/* Expiration Error */}
              {!otpSecurity.isLocked && otpExpiration.isExpired && (
                <div role="alert" className="text-xs text-theme_14_samecolour flex items-center gap-1.5 mt-2">
                  <JOJOCommonImage
                    src={LOGOS.ERROR_ICON}
                    altKey="img_jojo_logo"
                    width={12}
                    height={12}
                    preset={JOJOImagePreset.Logo}
                    wrapperClassName="size-3 flex-shrink-0"
                  />
                  OTP has expired. Please request a new one.
                </div>
              )}

              {/* Resend */}
              <div className="flex flex-col items-center w-full text-center py-8">
                <p className="m-0 text-sm text-theme_5">
                  {countdown > 0 && !otpSecurity.isLocked ? (
                    <>{t("resend_in")} <span className="text-theme_13_samecolour font-semibold tabular-nums">{formatTime(countdown)}</span></>
                  ) : (
                    <span
                      role="button"
                      tabIndex={isDisabled ? -1 : 0}
                      aria-disabled={isDisabled}
                      onClick={() => { if (!isDisabled) handleResend(OtpDeliveryMethod.SMS); }}
                      onKeyDown={(e) => { if (!isDisabled && (e.key === "Enter" || e.key === " ")) handleResend(OtpDeliveryMethod.SMS); }}
                      className={cn("text-theme_13_samecolour cursor-pointer body-xs-medium transition-colors duration-150", isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:underline")}
                    >
                      {!isEmail ? t("resend_now_on") : t("resend_now")}
                    </span>
                  )}
                </p>
              </div>
            </JOJOCardContent>

            <JOJOCardFooter>
              <JOJOCustomButton
                ref={submitButtonRef}
                size={JOJOButton.Size.L}
                state={canSubmit && !otpSecurity.isLocked && !otpExpiration.isExpired ? JOJOButton.State.ACTIVE : JOJOButton.State.DISABLED}
                type="submit"
                disabled={!canSubmit || verifyOtp.isPending || isNavigating || otpSecurity.isLocked || otpExpiration.isExpired}
                isLoading={verifyOtp.isPending || isNavigating}
                className="rounded-[100px] hover:opacity-90 body-sm-medium w-1/2 mt-10 border-none m-4"
              >
                {isRegister ? t("submit_register") : t("submit_login")}
              </JOJOCustomButton>
            </JOJOCardFooter>
          </form>
        </JOJOCustomCard>
      </div>
    </div>
  );
}
