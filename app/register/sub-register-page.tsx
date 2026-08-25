"use client";

import { getErrorMessage } from "@/app/login/validate";
import { AuthForm } from "@/components/common/AuthForm";
import { buildDisclaimer } from "@/components/common/disclaimer";
import { StorageKey } from "@/enums/storage.enum";
import { ErrorKey } from "@/enums/ui.enum";
import { appConfig } from "@/lib/config/app.config";
import { REGEX } from "@/lib/constants/regex";
import { ROUTES } from "@/lib/constants/routes";
import { localStorageManager } from "@/lib/localStorage/localStorage.manager";
import { logger } from "@/lib/logger/logger";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { selectReset, selectSetCountryCode, selectSetValue, useRegisterStore } from "./store";
import { useRegisterSubmit } from "./useRegisterSubmit";

export default function RegisterPageClient() {
  return (
    <Suspense>
      <RegisterPageContent />
    </Suspense>
  );
}

function RegisterPageContent() {
  const t = useTranslations("registerPage");
  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const reset = useRegisterStore(selectReset);
  const setValue = useRegisterStore(selectSetValue);
  const setCountryCode = useRegisterStore(selectSetCountryCode);

  const {
    value, error, touched, canSubmit, countryCode, isSubmitting,
    handleChange, handleBlur, handleSubmit, handleDropdownOpen,
  } = useRegisterSubmit();

  // Restrict Indian users from accessing register page directly
  useEffect(() => {
    // Read geo cache directly from localStorage
    const geoCache = localStorageManager.get<{
      geoData: { country_code: string };
      isAvailable: boolean;
    }>(StorageKey.GEO_CACHE);

    if (geoCache?.geoData) {
      const isIndianUser = geoCache.geoData.country_code === appConfig.GEO_DEFAULT_COUNTRY_CODE;

      if (isIndianUser) {
        logger.info('[Register] Indian user detected, redirecting to login', {
          country: geoCache.geoData.country_code
        });
        router.replace(ROUTES.LOGIN);
        return;
      }

      logger.info('[Register] Overseas user detected, allowing access', {
        country: geoCache.geoData.country_code
      });
    } else {
      // No geo cache available yet - allow access (bootstrap still loading)
      logger.info('[Register] No geo cache available, allowing access');
    }
  }, [router]);

  // Pre-fill form from URL params (when redirected from login page)
  useEffect(() => {
    const email = searchParams?.get("email");
    const phone = searchParams?.get("phone");
    const phoneCodeParam = searchParams?.get("phoneCode");

    if (email) {
      logger.info('[Register] Pre-filling email from URL', { email });
      setValue(email);
    } else if (phone) {
      logger.info('[Register] Pre-filling phone from URL', { phone, phoneCode: phoneCodeParam });
      setValue(phone);
      if (phoneCodeParam) {
        setCountryCode(phoneCodeParam);
      }
    }
  }, [searchParams, setValue, setCountryCode]);

  useEffect(() => () => reset(), [reset]);

  const disclaimer = buildDisclaimer({
    supportEmail: t("support_email"),
    disclaimerFirst: (tags) => t.rich("disclaimerFirst", tags),
    disclaimerSecound: (tags) => t.rich("disclaimerSecound", tags),
  });

  // Custom error renderer for USER_ALREADY_EXISTS
  const renderError = () => {
    if (error === ErrorKey.USER_ALREADY_EXISTS) {
      return (
        <span>
          {t("error_user_already_exists")}{" "}
          <span
            role="button"
            tabIndex={0}
            className="text-theme_13_samecolour cursor-pointer hover:underline font-semibold"
            onClick={() => {
              // Pre-fill login page with the entered email/phone
              const isPhone = value.includes(appConfig.MOBILE_NUMBER_START_WITH) || REGEX.LEADING_DIGIT_REGEX.test(value.trim());
              if (isPhone) {
                router.push(`${ROUTES.LOGIN}?phone=${encodeURIComponent(value.trim())}&phoneCode=${encodeURIComponent(countryCode)}`);
              } else {
                router.push(`${ROUTES.LOGIN}?email=${encodeURIComponent(value.trim())}`);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const isPhone = value.includes(appConfig.MOBILE_NUMBER_START_WITH) || REGEX.LEADING_DIGIT_REGEX.test(value.trim());
                if (isPhone) {
                  router.push(`${ROUTES.LOGIN}?phone=${encodeURIComponent(value.trim())}&phoneCode=${encodeURIComponent(countryCode)}`);
                } else {
                  router.push(`${ROUTES.LOGIN}?email=${encodeURIComponent(value.trim())}`);
                }
              }
            }}
          >
            {t("login")}
          </span>
        </span>
      );
    }
    return getErrorMessage(error!, t);
  };

  return (
    <AuthForm
      strings={{
        title: t("title"),
        placeholder: t("placeholder"),
        disclaimer,
        nextLabel: t("next"),
        dividerLabel: t("or_continue_with"),
        footerText: t("already_user"),
        footerLinkLabel: t("login"),
      }}
      value={value}
      error={error}
      touched={touched}
      canSubmit={canSubmit}
      isSubmitting={isSubmitting}
      onChange={handleChange}
      onBlur={handleBlur}
      onSubmit={handleSubmit}
      onDropdownOpen={handleDropdownOpen}
      onFooterLink={() => router.push(ROUTES.LOGIN)}
      getError={renderError}
    />
  );
}
