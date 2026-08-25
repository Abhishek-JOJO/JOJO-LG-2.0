/**
 * Apple Sign-In Callback Page
 * 
 * Handles redirect from Apple after authentication
 * Extracts token and completes login flow
 */

"use client";

import { Loader } from "@/components/common/Loader";
import { ErrorMessage, SocialMediaMethos } from "@/enums/ui.enum";
import { validateAppleState, clearAppleState } from "@features/auth/providers/apple.provider";
import { extractEmailFromToken, hasPhoneNumberInsteadOfEmail } from "@features/auth/providers/tokenDecoder";
import { useSocialLogin } from "@features/auth/hooks/useSocialLogin";
import { logger } from "@/lib/logger/logger";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { StorageKey } from "@/enums/storage.enum";
import { useToastStore } from "@store/useToastStore";

function AppleCallbackContent() {
  const t = useTranslations("appleCallback");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate } = useSocialLogin();
  const [error, setError] = useState<string | null>(null);
  const { show: showToast } = useToastStore();

  useEffect(() => {
    // Extract parameters from URL
    const idToken = searchParams.get(StorageKey.ID_TOKEN);
    const code = searchParams.get(StorageKey.CODE);
    const state = searchParams.get(StorageKey.STATE);
    const errorParam = searchParams.get(StorageKey.ERROR);

    logger.info("[Apple Callback] Processing callback", {
      hasIdToken: !!idToken,
      hasCode: !!code,
      hasState: !!state,
      hasError: !!errorParam,
      isPopup: !!window.opener,
    });

    // Check if this is a popup callback
    const isPopup = !!window.opener && !window.opener.closed;

    // Handle error from Apple
    if (errorParam) {
      logger.error("[Apple Callback] Error from Apple", { error: errorParam });
      
      if (isPopup) {
        // Send error to opener and close popup immediately
        try {
          localStorage.setItem('apple_callback_data', JSON.stringify({ error: errorParam }));
          window.opener.postMessage(
            { type: 'apple_auth_error', error: errorParam },
            window.location.origin
          );
        } catch (e) {
          logger.error("[Apple Callback] Failed to send error to opener", e);
        }
        window.close();
      } else {
        // Fallback: full page redirect
        setError(ErrorMessage.APPLE_SIGN_IN_WAS_CANCELLED_OR_FAILED);
        router.push(`${ROUTES.LOGIN}?error=apple_cancelled`);
      }
      return;
    }

    // Validate state (CSRF protection)
    if (state && !validateAppleState(state)) {
      logger.warn("[Apple Callback] State mismatch - possible CSRF or storage cleared during redirect");
    }

    // Extract token (prefer id_token, fallback to code)
    const token = idToken || code;

    if (!token) {
      logger.error("[Apple Callback] No token received");
      
      if (isPopup) {
        // Send error to opener and close popup immediately
        try {
          localStorage.setItem('apple_callback_data', JSON.stringify({ error: 'no_token' }));
          window.opener.postMessage(
            { type: 'apple_auth_error', error: 'no_token' },
            window.location.origin
          );
        } catch (e) {
          logger.error("[Apple Callback] Failed to send error to opener", e);
        }
        window.close();
      } else {
        // Fallback: full page redirect
        setError(ErrorMessage.NO_AUTHENTICATION_TOKEN_RECEIVED);
        router.push(`${ROUTES.LOGIN}?error=apple_no_token`);
      }
      return;
    }

    // If this is a popup, send token back to opener and close IMMEDIATELY
    if (isPopup) {
      logger.info("[Apple Callback] Popup mode - sending token to opener and closing");
      try {
        // Store callback data in localStorage for opener to read
        localStorage.setItem('apple_callback_data', JSON.stringify({ token, state }));
        
        // Also try postMessage as backup
        window.opener.postMessage(
          { type: 'apple_auth_success', token, state },
          window.location.origin
        );
        
        logger.info("[Apple Callback] Token sent to opener, closing popup immediately");
        
        // Close popup IMMEDIATELY (no delay)
        window.close();
      } catch (e) {
        logger.error("[Apple Callback] Failed to send token to opener", e);
        window.close();
      }
      return;
    }

    // If not a popup, continue with normal flow (fallback for direct navigation)
    logger.info("[Apple Callback] Full page mode - processing login");

    // Check if user used phone number instead of email
    if (hasPhoneNumberInsteadOfEmail(token)) {
      logger.warn("[Apple Callback] Phone number detected in Apple ID - showing error message");
      showToast(
        t("error_phone_number_detected"),
        "error"
      );
      // Redirect back to login after showing toast
      setTimeout(() => {
        router.push(ROUTES.LOGIN);
      }, 3000);
      return;
    }

    // Extract email from token
    const email = extractEmailFromToken(token, SocialMediaMethos.APPLE) ?? undefined;

    if (!email) {
      logger.info("[Apple Callback] No email in token (expected for returning users)");
    }

    // Clean up state
    clearAppleState();

    logger.info("[Apple Callback] Token received, calling mutation", { hasEmail: !!email });

    // Call social login mutation
    mutate(
      { source: "apple", token, ...(email ? { email } : {}) },
      {
        onSuccess: (data) => {
          logger.info("[Apple Callback] Login successful", {
            isNewUser: data.isNewUser
          });

          // For new users, redirect to profile creation
          // For existing users, redirect to watching page
          if (data.isNewUser) {
            logger.info("[Apple Callback] New user - redirecting to profile creation");
            router.push(ROUTES.REGISTER_CREATE_ACCOUNT);
          } else {
            logger.info("[Apple Callback] Existing user - redirecting to watching");
            router.push(ROUTES.WATCHING);
          }
        },
        onError: (error: any) => {
          // Log the full error structure for debugging
          logger.error("[Apple Callback] ===== LOGIN ERROR START =====");
          logger.error("[Apple Callback] Full Error Object:", error);
          logger.error("[Apple Callback] Error Constructor:", error?.constructor?.name);
          logger.error("[Apple Callback] Error Message:", error?.message);
          logger.error("[Apple Callback] Error Status:", error?.status);
          logger.error("[Apple Callback] Error Name:", error?.name);
          logger.error("[Apple Callback] Error Keys:", error ? Object.keys(error) : 'null');
          logger.error("[Apple Callback] ===== LOGIN ERROR END =====");
          
          // For Apple login, a 400 error almost always means email is required
          // (user used phone number instead of email)
          // Check multiple possible error structures
          
          // AppError has a 'status' property directly on the error object
          const errorStatus = error?.status;
          const errorMessage = error?.message || '';
          const errorName = error?.name || '';
          
          // Check if it's a 400 error in multiple ways
          const is400Error = 
            errorStatus === 400 || 
            errorStatus === '400' ||
            error?.response?.status === 400 ||
            errorMessage.includes('400') || 
            errorMessage.includes('email is required') ||
            errorMessage.includes('"email":"email is required"') ||
            errorMessage.includes('email":') ||
            (errorName === 'AppError' && errorStatus === 400);
          
          logger.error("[Apple Callback] Error Status Value:", errorStatus);
          logger.error("[Apple Callback] Error Status Type:", typeof errorStatus);
          logger.error("[Apple Callback] Is 400 Error?", is400Error);
          logger.error("[Apple Callback] Error message check:", errorMessage);
          
          if (is400Error) {
            // 400 from Apple social login = email required
            logger.warn("[Apple Callback] ✅ 400 Error detected - showing phone number error");
            
            // Show toast with proper translation
            const errorMessage = t("error_phone_number_not_allowed");
            logger.info("[Apple Callback] Toast message:", errorMessage);
            
            showToast(errorMessage, "error");
            
            // Redirect back to login after showing toast
            setTimeout(() => {
              logger.info("[Apple Callback] Redirecting to login page");
              router.push(ROUTES.LOGIN);
            }, 5000); // 5 seconds to read the message
          } else {
            // Other errors
            logger.error("[Apple Callback] ❌ Non-400 error - showing generic message");
            setError(ErrorMessage.FAILED_TO_COMPLETE_SIGN_IN);
            showToast(
              ErrorMessage.FAILED_TO_COMPLETE_SIGN_IN,
              "error"
            );
            setTimeout(() => {
              router.push(`${ROUTES.LOGIN}?error=apple_login_failed`);
            }, 2000);
          }
        },
      }
    );
  }, [searchParams, mutate, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            {t("error_title")}
          </h1>
          <p className="text-theme_5 mb-4">{error}</p>
          <p className="text-sm text-theme_5">{t("error_redirect")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader />
      <div className="ml-4">
        <p className="text-lg font-medium">{t("loading_title")}</p>
        <p className="text-sm text-theme_5">{t("loading_subtitle")}</p>
      </div>
    </div>
  );
}

export default function AppleCallbackPage() {
  return (
    <Suspense>
      <AppleCallbackContent />
    </Suspense>
  );
}
