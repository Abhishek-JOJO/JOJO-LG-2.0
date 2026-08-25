/**
 * Google Login Button Component
 * 
 * Handles Google Sign-In flow
 */

"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { ErrorKey, SocialMediaMethos } from "@/enums/ui.enum";
import { logger } from "@/lib/logger/logger";
import { ReactNode, useState } from "react";
import { useSocialLogin } from "../hooks/useSocialLogin";
import { getGoogleToken } from "../providers/google.provider";

interface GoogleLoginButtonProps {
  onSuccess?: (isNewUser?: boolean) => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: ReactNode;
  hideChildrenWhenLoading?: boolean;
}

export function GoogleLoginButton({
  onSuccess,
  onError,
  className = "",
  children,
  hideChildrenWhenLoading = false,
}: GoogleLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { mutate, isPending } = useSocialLogin();

  const handleGoogleLogin = async () => {
    // Prevent multiple clicks
    if (isLoading || isPending) {
      return;
    }

    setIsLoading(true);

    try {
      logger.info("[Google Login] Starting...");

      // Get token and user info from Google
      const response = await getGoogleToken();

      logger.info("[Google Login] Token and user info received", {
        email: response.email,
        hasToken: !!response.accessToken
      });

      // Email is already extracted from the API response
      const email = response.email;

      if (!email) {
        throw new Error(ErrorKey.NO_EMAIL_FOUND_IN_GOOGLE_TOKEN);
      }

      logger.info("[Google Login] Using email from user info", { email });

      // Call mutation with access token and email
      mutate(
        { source: SocialMediaMethos.GOOGLE, token: response.accessToken, email },
        {
          onSuccess: (data) => {
            setIsLoading(false);
            onSuccess?.(data.isNewUser);
          },
          onError: (error) => {
            setIsLoading(false);
            onError?.(error as Error);
          },
        }
      );
    } catch (error) {
      setIsLoading(false);
      logger.error("[Google Login] Failed", { error });
      onError?.(error as Error);
    }
  };

  const isDisabled = isLoading || isPending;

  return (
    <JOJOCustomButton
      size={JOJOButton.Size.S}
      state={isDisabled ? JOJOButton.State.DISABLED : JOJOButton.State.DEFAULT}
      type="button"
      onClick={handleGoogleLogin}
      disabled={isDisabled}
      isLoading={isDisabled}
      hideChildrenWhenLoading={hideChildrenWhenLoading}
      className={className}
      aria-label="Sign in with Google"
    >
      {children || (isLoading || isPending ? "Signing in..." : "Sign in with Google")}
    </JOJOCustomButton>
  );
}
