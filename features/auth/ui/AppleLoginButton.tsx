/**
 * Apple Login Button Component
 * 
 * Handles Apple Sign-In flow (popup-based)
 */

"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { ReactNode, useState } from "react";
import { initiateAppleLogin, clearAppleState } from "../providers/apple.provider";
import { useSocialLogin } from "../hooks/useSocialLogin";
import { extractEmailFromToken, hasPhoneNumberInsteadOfEmail } from "../providers/tokenDecoder";
import { SocialMediaMethos } from "@/enums/ui.enum";
import { logger } from "@/lib/logger/logger";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useToastStore } from "@store/useToastStore";
import { useTranslations } from "next-intl";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";

interface AppleLoginButtonProps {
  onError?: (error: Error) => void;
  className?: string;
  children?: ReactNode;
  hideChildrenWhenLoading?: boolean;
}

export function AppleLoginButton({
  onError,
  className = "",
  children,
  hideChildrenWhenLoading = false,
}: AppleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // New state for after popup closes
  const { mutate } = useSocialLogin();
  const router = useRouter();
  const { show: showToast } = useToastStore();
  const t = useTranslations("appleCallback");
  const { isAppReady } = useBootstrap();

  const handleAppleLogin = async () => {
    // Wait for app to be ready
    if (!isAppReady) {
      logger.warn("[Apple Login] App not ready yet, waiting...");
      showToast(t("init_waiting"), "info");
      return;
    }

    // Prevent multiple clicks
    if (isLoading || isProcessing) {
      return;
    }

    setIsLoading(true); // Button disabled state only

    try {
      logger.info("[Apple Login] Opening popup...");
      
      // Initiate Apple sign-in (opens popup)
      // While popup is open, NO loading overlay
      const result = await initiateAppleLogin();
      
      // Popup closed - now show loading overlay
      setIsLoading(false);
      setIsProcessing(true);
      
      logger.info("[Apple Login] Popup closed, processing token...");
      
      // Check if error was returned
      if ('error' in result) {
        logger.error("[Apple Login] Error from popup:", result.error);
        setIsProcessing(false);
        
        if (result.error === 'no_token') {
          showToast(t("error_no_token"), "error");
        } else {
          showToast(t("error_cancelled_failed"), "error");
        }
        return;
      }
      
      const { token, state } = result;
      
      logger.info("[Apple Login] Token received, calling API...");

      // Check if user used phone number instead of email
      if (hasPhoneNumberInsteadOfEmail(token)) {
        logger.warn("[Apple Login] Phone number detected in Apple ID");
        showToast(t("error_phone_number_detected"), "error");
        setIsProcessing(false);
        return;
      }

      // Extract email from token
      const email = extractEmailFromToken(token, SocialMediaMethos.APPLE) ?? undefined;

      if (!email) {
        logger.info("[Apple Login] No email in token (expected for returning users)");
      }

      // Clean up state
      clearAppleState();

      logger.info("[Apple Login] Calling social login API", { hasEmail: !!email });

      // Call social login mutation - keep processing state until redirect
      mutate(
        { source: "apple", token, ...(email ? { email } : {}) },
        {
          onSuccess: (data) => {
            logger.info("[Apple Login] Login successful", {
              isNewUser: data.isNewUser
            });

            // Keep processing state during redirect for smooth UX
            // For new users, redirect to profile creation
            // For existing users, redirect to watching page
            if (data.isNewUser) {
              logger.info("[Apple Login] New user - redirecting to profile creation");
              router.push(ROUTES.REGISTER_CREATE_ACCOUNT);
            } else {
              logger.info("[Apple Login] Existing user - redirecting to watching");
              router.push(ROUTES.WATCHING);
            }
            // Don't set processing to false - let the redirect happen
          },
          onError: (error: any) => {
            setIsProcessing(false);
            logger.error("[Apple Login] Login failed", { error });

            // Check for 400 error (phone number used)
            const errorStatus = error?.status;
            const errorMessage = error?.message || '';
            const is400Error = 
              errorStatus === 400 || 
              errorStatus === '400' ||
              errorMessage.includes('email is required');

            if (is400Error) {
              showToast(t("error_phone_number_not_allowed"), "error");
            } else {
              showToast(t("error_generic_login_failed"), "error");
            }

            onError?.(error as Error);
          },
        }
      );
    } catch (error) {
      setIsLoading(false);
      setIsProcessing(false);
      logger.error("[Apple Login] Failed to initiate", { error });
      
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Popup blocked')) {
        showToast(t("error_popup_blocked"), "error");
      } else if (errorMessage.includes('cancelled')) {
        // User cancelled, no need to show error
        logger.info("[Apple Login] User cancelled");
      } else {
        showToast(t("error_failed_to_open"), "error");
      }
      
      onError?.(error as Error);
    }
  };

  return (
    <>
      <JOJOCustomButton
        size={JOJOButton.Size.S}
        state={isLoading || isProcessing ? JOJOButton.State.DISABLED : JOJOButton.State.DEFAULT}
        type="button"
        onClick={handleAppleLogin}
        disabled={isLoading || isProcessing}
        isLoading={isLoading || isProcessing}
        hideChildrenWhenLoading={hideChildrenWhenLoading}
        className={className}
        aria-label="Sign in with Apple"
      >
        {children || (isLoading || isProcessing ? t("signing_in_btn") : t("sign_in_btn"))}
      </JOJOCustomButton>

      {/* Full-screen loading overlay - ONLY show AFTER popup closes (isProcessing) */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-theme_1 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-theme_3/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-theme_6 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-theme_7 mb-1">
                {t("signing_in_title")}
              </p>
              <p className="text-sm text-theme_5">
                {t("loading_subtitle")}...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
