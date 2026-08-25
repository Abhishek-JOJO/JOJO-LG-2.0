/**
 * Facebook Login Button Component
 * 
 * Handles Facebook Login flow
 */

"use client";

import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { logger } from "@/lib/logger/logger";
import { ReactNode, useState } from "react";
import { useSocialLogin } from "../hooks/useSocialLogin";
import { getFacebookToken, getFacebookUserEmail } from "../providers/facebook.provider";
import { ErrorKey, SocialMediaMethos } from "@/enums/ui.enum";

interface FacebookLoginButtonProps {
  onSuccess?: (isNewUser?: boolean) => void;
  onError?: (error: Error) => void;
  className?: string;
  children?: ReactNode;
  hideChildrenWhenLoading?: boolean;
}

export function FacebookLoginButton({
  onSuccess,
  onError,
  className = "",
  children,
  hideChildrenWhenLoading = false,
}: FacebookLoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { mutate, isPending } = useSocialLogin();

  const handleFacebookLogin = async () => {
    // Prevent multiple clicks
    if (isLoading || isPending) {
      return;
    }

    setIsLoading(true);

    try {
      logger.info("[Facebook Login] Starting...");

      // Get token from Facebook
      const token = await getFacebookToken();

      logger.info("[Facebook Login] Token received");

      // Get user email from Facebook API
      const email = await getFacebookUserEmail(token);

      if (!email) {
        throw new Error(ErrorKey.NO_EMAIL_FOUND_IN_FACEBOOK_RESPONCE);
      }

      logger.info("[Facebook Login] Email retrieved", { email });

      // Call mutation with email
      mutate(
        { source: SocialMediaMethos.FACEBOOK, token, email },
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
      logger.error("[Facebook Login] Failed", { error });
      onError?.(error as Error);
    }
  };

  const isDisabled = isLoading || isPending;

  return (
    <JOJOCustomButton
      size={JOJOButton.Size.S}
      state={isDisabled ? JOJOButton.State.DISABLED : JOJOButton.State.DEFAULT}
      type="button"
      onClick={handleFacebookLogin}
      disabled={isDisabled}
      isLoading={isDisabled}
      hideChildrenWhenLoading={hideChildrenWhenLoading}
      className={className}
      aria-label="Sign in with Facebook"
    >
      {children || (isLoading || isPending ? "Signing in..." : "Sign in with Facebook")}
    </JOJOCustomButton>
  );
}
