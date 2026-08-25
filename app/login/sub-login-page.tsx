"use client";

import { Suspense } from "react";
import { PageBackground } from "@/components/common/PageBackground";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import {
  JOJOCardContent,
  JOJOCardFooter,
  JOJOCardHeader,
  JOJOCardTitle,
  JOJOCustomCard,
} from "@/components/ui/JOJOCard";
import { StorageKey } from "@/enums/storage.enum";
import { ErrorKey, LoginIdentifierType } from "@/enums/ui.enum";
import { appConfig } from "@/lib/config/app.config";
import { LOGOS } from "@/lib/constants/assets";
import { REGEX } from "@/lib/constants/regex";
import { ROUTES } from "@/lib/constants/routes";
import { logger } from "@/lib/logger/logger";
import { themeColors } from "@/tailwind.config";
import { useCheckUserExists, useInitiateOtp, useVerifySpecialUser } from "@features/auth/hooks/useOtpLogin";
import { useToastStore } from "@store/useToastStore";
import { AppleLoginButton } from "@features/auth/ui/AppleLoginButton";
import { FacebookLoginButton } from "@features/auth/ui/FacebookLoginButton";
import { GoogleLoginButton } from "@features/auth/ui/GoogleLoginButton";
import { useCountries } from "@features/country/hooks/useCountries";
import { useGeoAvailability } from "@features/geo/hooks/useGeoAvailability";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import CountryWithEMailInput from "./components/CountryWithEmailInput";
import SocialBtn from "./components/social-buttons";
import { getErrorMessage, validate } from "./validate";
import { handleLoginKeyDown, isPossiblePhoneInput, normalizePhoneNumber } from "@/lib/utils";
import { useOtpStore } from "./otp/store";
import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { analyticsService } from "@/shared/analytics";
import { useFocusable, setFocus } from "@noriginmedia/norigin-spatial-navigation";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const t = useTranslations("loginPage");
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const checkUserExists = useCheckUserExists();
  const initiateOtp = useInitiateOtp();
  const verifySpecialUser = useVerifySpecialUser();
  const showToast = useToastStore((s: any) => s.show);
  const { data: countries, isLoading: countriesLoading, error: countriesError } = useCountries();
  const { isAvailable, countryCode: geoCountryCode } = useGeoAvailability();
  const setAuthContext = useOtpStore(state => state.setAuthContext);

  const [value, setValue] = useState("");
  const [phoneCode, setPhoneCode] = useState<string>(
    LoginIdentifierType.PHONE_CODE_NUMBER_DEFAULT
  );
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    appConfig.DEFAULT_COUNTRY_NAME
  );
  const [error, setError] = useState<ErrorKey | null>(null);
  const [touched, setTouched] = useState(false);

  // ── Focus setup ──────────────────────────────────────────────────────────
  const { ref: inputRef, focused: inputFocused } = useFocusable({
    focusKey: 'login-input',
    onEnterPress: () => {
      // Trigger native keyboard or handle submit if valid
      const el = document.getElementById("login-input-field");
      if (el) el.focus();
    }
  });

  const { ref: submitRef, focused: submitFocused } = useFocusable({
    focusKey: 'login-submit',
    onEnterPress: () => {
      // Manually trigger form submit
      const form = document.getElementById("login-form") as HTMLFormElement;
      if (form && canSubmit && !initiateOtp.isPending && !checkUserExists.isPending) {
        form.requestSubmit();
      }
    }
  });

  useEffect(() => {
    // Focus the input when the page loads
    setTimeout(() => {
      setFocus('login-input');
    }, 300);
  }, []);

  const lastTrackedErrorRef = useRef<ErrorKey | null>(null);

  // Track login_failed event ONCE per unique error on the login page
  useEffect(() => {
    if (error) {
      if (lastTrackedErrorRef.current !== error) {
        lastTrackedErrorRef.current = error;
        try {
          const trimmed = value.trim();
          const isPhone = isPossiblePhoneInput(trimmed);
          analyticsService.trackLoginFailed({
            error_code: String(error),
            error_message: getErrorMessage(error, t),
            method: isPhone ? "phone" : "email",
            phone_code: isPhone ? phoneCode : undefined,
            phoneCode: isPhone ? phoneCode : undefined,
            value: trimmed,
            source_link: typeof window !== "undefined" ? window.location.href : "",
          });
          logger.info("[Login] Tracked login_failed event for error", { error });
        } catch (e) {
          logger.error("[Login] Failed to track login_failed event", e);
        }
      }
    } else {
      lastTrackedErrorRef.current = null;
    }
  }, [error, t, value, phoneCode]);

  // Pre-fill form from URL params (when redirected from register page)
  useEffect(() => {
    const email = searchParams?.get("email");
    const phone = searchParams?.get("phone");
    const phoneCodeParam = searchParams?.get("phoneCode");

    if (email) {
      logger.info('[Login] Pre-filling email from URL', { email });
      setValue(email);
    } else if (phone) {
      logger.info('[Login] Pre-filling phone from URL', { phone, phoneCode: phoneCodeParam });
      setValue(phone);
      if (phoneCodeParam) {
        setPhoneCode(phoneCodeParam);
        // Find country by phone code to set selectedCountryCode
        if (countries) {
          const country = countries.find(c => c.phone_code === phoneCodeParam);
          if (country) {
            setSelectedCountryCode(country.country_code);
          }
        }
      }
    }
  }, [searchParams, countries]);

  useEffect(() => {
    if (countries) {
      logger.info("[Login] Countries loaded", {
        count: countries.length,
        sample: countries.slice(0, 3),
      });
    }

    if (countriesError) {
      logger.error("[Login] Countries error", {
        error: countriesError,
      });
    }
  }, [countries, countriesError]);

  // Log geo availability status
  useEffect(() => {
    logger.info('[Login] Geo availability status', {
      isAvailable,
      countryCode: geoCountryCode,
      behavior: isAvailable ? 'India mode (login handles registration)' : 'Overseas mode (separate registration)'
    });
  }, [isAvailable, geoCountryCode]);

  // Set default phone code from geo location on mount
  useEffect(() => {
    if (!countries || countries.length === 0) return;

    const cachedGeoStr = localStorage.getItem(StorageKey.GEO_CACHE);
    if (!cachedGeoStr) return;

    try {
      const cachedGeo = JSON.parse(cachedGeoStr);
      const countryCode = cachedGeo?.geoData?.country_code;

      if (!countryCode) return;

      const geoCountry = countries.find(
        (country) =>
          country.country_code.toUpperCase() === countryCode.toUpperCase()
      );

      if (!geoCountry) return;

      setPhoneCode(geoCountry?.phone_code);
      setSelectedCountryCode(geoCountry?.country_code);

      logger.info("[Login] Set phone code from geo", {
        countryCode: geoCountry.country_code,
        country: geoCountry.country_name,
        phoneCode: geoCountry.phone_code,
      });
    } catch (parseError) {
      logger.error("[Login] Failed to parse geo cache", {
        error: parseError,
      });
    }
  }, [countries]);

  const isMobileInput = useMemo(() => {
    return isPossiblePhoneInput(value.trim());
  }, [value]);

  const canSubmit = useMemo(() => {
    const trimmed = value.trim();

    return trimmed?.length > 0 && !validate(trimmed);
  }, [value]);

  const sanitizeLoginInput = (value: string) => {
    return value.replace(REGEX.SENITIZE_LOGIN_INPUT, "");
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = sanitizeLoginInput(event.target.value);
    let nextValue = rawValue;

    if (rawValue.startsWith(appConfig?.MOBILE_NUMBER_START_WITH) && countries?.length) {
      const digits = rawValue.replace(REGEX?.NON_DIGIT, "");

      let bestMatch = null as typeof countries[0] | null;
      let bestLength = 0;

      for (const country of countries) {
        const code = String(country.phone_code).replace(REGEX?.NON_DIGIT, "");
        if (!code || !digits.startsWith(code)) continue;
        if (code.length > bestLength) {
          bestMatch = country;
          bestLength = code?.length;
        }
      }

      if (bestMatch) {
        const national = digits.slice(bestLength);
        setPhoneCode(bestMatch?.phone_code);
        setSelectedCountryCode(bestMatch?.country_code);

        if (national?.length > 0) {
          nextValue = national;
        }
      }
    }

    setValue(nextValue);
    if (touched) {
      setError(validate(nextValue?.trim()));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validate(value?.trim()));
  };

  const handleCountryCode = (country: {
    phone_code: string;
    country_code: string;
  }) => {
    setPhoneCode(country.phone_code);
    setSelectedCountryCode(country.country_code);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = value.trim();
    const validationError = validate(trimmed);

    setTouched(true);
    setError(validationError);

    if (validationError) return;

    const isPhone = isPossiblePhoneInput(trimmed);

    /**
     * Phone payload helper.
     *
     * Examples:
     * 9876543210      -> phone: "9876543210", phoneCode: "91"
     * 919876543210    -> phone: "9876543210", phoneCode: "91"
     * +919876543210   -> phone: "9876543210", phoneCode: "91"
     */
    const getPhonePayload = () => {
      const normalized = normalizePhoneNumber(
        trimmed,
        selectedCountryCode || appConfig?.DEFAULT_COUNTRY_NAME
      );

      return {
        phone: normalized?.national,
        phoneCode: phoneCode,
        internationalPhone: normalized?.international,
      };
    };

    // OVERSEAS USER FLOW: Check if user exists first
    if (!isAvailable) {
      logger.info("[Login] Overseas user - checking if user exists first");

      if (isPhone) {
        try {
          const phonePayload = getPhonePayload();
          logger.info("phonePayload", phonePayload)
          const result = await checkUserExists.mutateAsync({
            phone: phonePayload.phone,
            phoneCode: phonePayload.phoneCode,
          });

          if (!result.exists) {
            logger.info("[Login] User not found, redirecting to register");
            setError(ErrorKey.USER_NOT_FOUND);
            return;
          }

          if (result.isSpecialUser) {
            logger.info("[Login] Special user (overseas phone) detected, executing direct login");
            await verifySpecialUser.mutateAsync({
              phone: phonePayload.phone,
              phoneCode: phonePayload.phoneCode,
              isRegister: false,
            });
            showToast(t("login_success") || "Special User Login Successful!", "success");
            router.push(ROUTES.WATCHING || "/watching");
            return;
          }

          logger.info("[Login] User exists, sending OTP");

          await initiateOtp.mutateAsync({
            phone: phonePayload.phone,
            phoneCode: phonePayload.phoneCode,
          });

          setAuthContext({
            phone: phonePayload.phone,
            phoneCode: phonePayload.phoneCode,
            isRegister: false,
          });

          router.push(ROUTES.LOGIN_OTP);
        } catch (err) {
          setError(ErrorKey.INVALID_PHONE);
        }

        return;
      }

      // Email flow
      try {
        const result = await checkUserExists.mutateAsync({
          phone: trimmed,
          phoneCode: "",
        });

        if (!result.exists) {
          logger.info("[Login] User not found, redirecting to register");
          setError(ErrorKey.USER_NOT_FOUND);
          return;
        }

        if (result.isSpecialUser) {
          logger.info("[Login] Special user (overseas email) detected, executing direct login");
          await verifySpecialUser.mutateAsync({
            phone: trimmed,
            phoneCode: "",
            isRegister: false,
          });
          showToast(t("login_success") || "Special User Login Successful!", "success");
          router.push(ROUTES.WATCHING || "/watching");
          return;
        }

        logger.info("[Login] User exists, sending OTP");

        await initiateOtp.mutateAsync({
          phone: trimmed,
          phoneCode: "",
        });

        setAuthContext({
          email: trimmed,
          isRegister: false,
        });

        router.push(ROUTES.LOGIN_OTP);
      } catch (err) {
        setError(ErrorKey.INVALID_EMAIL);
      }

      return;
    }

    // INDIA USER FLOW: Send OTP directly
    if (isPhone) {
      try {
        const phonePayload = getPhonePayload();

        const result = await initiateOtp.mutateAsync({
          phone: phonePayload.phone,
          phoneCode: phonePayload.phoneCode,
        });

        // SPECIAL USER BYPASS FLOW
        if (result?.isSpecialUser) {
          logger.info("[Login] Special user detected, initiating direct passwordless login");
          await verifySpecialUser.mutateAsync({
            phone: phonePayload.phone,
            phoneCode: phonePayload.phoneCode,
            isRegister: !result.isExists,
          });
          showToast(t("login_success") || "Special User Login Successful!", "success");
          router.push(ROUTES.WATCHING || "/watching");
          return;
        }

        const isRegister = !result?.isExists;

        setAuthContext({
          phone: phonePayload?.phone,
          phoneCode: phonePayload?.phoneCode,
          isRegister,
        });

        router.push(ROUTES.LOGIN_OTP);
      } catch {
        setError(ErrorKey.INVALID_PHONE);
      }

      return;
    }

    // Email flow
    try {
      const result = await initiateOtp.mutateAsync({
        phone: trimmed,
        phoneCode: "",
      });

      // SPECIAL USER BYPASS FLOW
      if (result?.isSpecialUser) {
        logger.info("[Login] Special user (email) detected, initiating direct passwordless login");
        await verifySpecialUser.mutateAsync({
          phone: trimmed,
          phoneCode: "",
          isRegister: !result.isExists,
        });
        showToast(t("login_success") || "Special User Login Successful!", "success");
        router.push(ROUTES.WATCHING || "/watching");
        return;
      }

      const isRegister = !result?.isExists;

      setAuthContext({
        email: trimmed,
        isRegister,
      });

      router.push(ROUTES.LOGIN_OTP);
    } catch {
      setError(ErrorKey.INVALID_EMAIL);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden -mt-15 lg:-mt-25">
      <PageBackground />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <JOJOCustomCard className="w-full max-w-sm sm:max-w-md" cardConfig={{
          borderGradient: "card_border_gradient",
          borderWidth: 2,
          showBorder: true,
          background: "theme_12_60"
        }}>
          <form id="login-form" onSubmit={handleSubmit} noValidate>
            <JOJOCardHeader>
              <JOJOCardTitle>{t("title")}</JOJOCardTitle>
            </JOJOCardHeader>

            <JOJOCardContent className="gap-0">
              <div className="flex flex-col pt-7">
                <div ref={inputRef as any} className={`rounded-[24px] transition-all ${inputFocused ? "ring-4 ring-white shadow-xl scale-[1.02] z-10" : ""}`}>
                  <CountryWithEMailInput
                    id="login-input-field"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    placeholder={t("placeholder")}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleLoginKeyDown}
                    onBlur={handleBlur}
                    error={Boolean(error && touched)}
                    showCountryCode={isMobileInput}
                    countries={countries}
                    countriesLoading={countriesLoading}
                    countriesError={countriesError}
                    phoneCode={phoneCode}
                    selectedCountryCode={selectedCountryCode}
                    defaultCountryCode={appConfig.DEFAULT_COUNTRY_NAME}
                    onCountryChange={handleCountryCode}
                    searchPlaceholder={t("search_country")}
                    loadingText={t("loading_countries")}
                    failedText={t("failed_countries")}
                    noCountriesText={t("no_countries")}
                  />
                </div>

                {error && touched && (
                  <div
                    role="alert"
                    className="m-0 text-xs text-theme_14_samecolour pl-4 flex items-center gap-2 mt-2"
                  >
                    <JOJOCommonImage
                      src={LOGOS.ERROR_ICON}
                      altKey="img_jojo_logo"
                      width={12}
                      height={12}
                      preset={JOJOImagePreset.Logo}
                      wrapperClassName="size-3 flex-shrink-0"
                    />
                    {getErrorMessage(error, t)}
                  </div>
                )}

                <div className="p-2 pt-3 caption-sm-regular text-theme_7">
                  {t("disclaimer")}
                </div>
              </div>

              <div ref={submitRef as any} className={`w-1/3 sm:w-1/4 mx-auto mt-10 rounded-[100px] transition-all ${submitFocused ? "ring-4 ring-white shadow-xl scale-105" : ""}`}>
                <JOJOCustomButton
                  size={JOJOButton.Size.L}
                  state={
                    canSubmit
                      ? JOJOButton.State.ACTIVE
                      : JOJOButton.State.DISABLED
                  }
                  hoverColor={themeColors.theme_13_samecolour}
                  type="submit"
                  disabled={!canSubmit || initiateOtp.isPending || checkUserExists.isPending}
                  isLoading={initiateOtp.isPending || checkUserExists.isPending}
                  className="w-full flex border-none body-sm-medium"
                >
                  {t("next")}
                </JOJOCustomButton>
              </div>

              <div className="flex items-center pt-10">
                <div className="flex-1" />

                <span className="body-xs-medium text-theme_5">
                  {t("or_login_with")}
                </span>

                <div className="flex-1 h-px" />
              </div>

              <div className="flex justify-center gap-3">
                <GoogleLoginButton
                  onSuccess={() => router.push(ROUTES.HOME)}
                  onError={(loginError) => {
                    logger.error("[Login] Google error", { error: loginError });
                    try {
                      analyticsService.trackLoginFailed({
                        method: "google",
                        error_message: String(loginError?.message || loginError),
                        source_link: typeof window !== "undefined" ? window.location.href : "",
                      });
                    } catch (e) {}
                  }}
                  hideChildrenWhenLoading
                  className="w-10.5 h-10.5 px-0 rounded-full bg-theme_10_50 flex items-center justify-center cursor-pointer transition-colors hover:bg-theme_9"
                >
                  <SocialBtn src={LOGOS.GOOGLE_LOGO} altKey="img_google" />
                </GoogleLoginButton>

                <FacebookLoginButton
                  onSuccess={() => router.push(ROUTES.HOME)}
                  onError={(loginError) => {
                    logger.error("[Login] Facebook error", { error: loginError });
                    try {
                      analyticsService.trackLoginFailed({
                        method: "facebook",
                        error_message: String(loginError?.message || loginError),
                        source_link: typeof window !== "undefined" ? window.location.href : "",
                      });
                    } catch (e) {}
                  }}
                  hideChildrenWhenLoading
                  className="w-10.5 h-10.5 rounded-full bg-theme_10_50 flex items-center justify-center cursor-pointer transition-colors hover:bg-theme_9"
                >
                  <SocialBtn
                    src={LOGOS.FACEBOOK_LOGO}
                    altKey="img_facebook"
                  />
                </FacebookLoginButton>

                <AppleLoginButton
                  onError={(loginError) => {
                    logger.error("[Login] Apple error", { error: loginError });
                    try {
                      analyticsService.trackLoginFailed({
                        method: "apple",
                        error_message: String(loginError?.message || loginError),
                        source_link: typeof window !== "undefined" ? window.location.href : "",
                      });
                    } catch (e) {}
                  }}
                  hideChildrenWhenLoading
                  className="w-10.5 h-10.5 rounded-full bg-theme_10_50 flex items-center justify-center cursor-pointer transition-colors hover:bg-theme_9"
                >
                  <SocialBtn src={LOGOS.APPLE_LOGO} altKey="img_apple" />
                </AppleLoginButton>
              </div>
            </JOJOCardContent>

            {!isAvailable && (
              <JOJOCardFooter>
                <p className="m-0 body-xs-regular text-center text-[var(--theme_7)] mt-8">
                  {t("not_existing_user")}
                  <span
                    role="button"
                    tabIndex={0}
                    className="text-[var(--theme_13_samecolour)] cursor-pointer hover:underline ml-1"
                    onClick={() => router.push(ROUTES.REGISTER)}
                    onKeyDown={(e) => e.key === "Enter" && router.push(ROUTES.REGISTER)}
                  >
                    {t("create_account")}
                  </span>
                </p>
              </JOJOCardFooter>
            )}
          </form>
        </JOJOCustomCard>
      </div>
    </div>
  );
}