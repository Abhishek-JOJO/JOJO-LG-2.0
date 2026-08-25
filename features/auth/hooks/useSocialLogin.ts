/**
 * Social Login Hook
 * 
 * React Query hook for social login
 * Handles Google, Facebook, and Apple login
 */

"use client";

import { useMutation } from "@tanstack/react-query";
import { socialLoginService } from "../services/auth.service";
import { useAuthStore } from "@store/useAuthStore";
import { handleError } from "@lib/error/handler";
import { logger } from "@/lib/logger/logger";
import type { SocialLoginRequest } from "../model/types";

/**
 * Social Login Hook
 * 
 * @returns React Query mutation for social login
 */
export function useSocialLogin() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (request: SocialLoginRequest) => {
      // Get session from store (if exists)
      const sessionId = useAuthStore.getState().token ?? undefined;
      
      // Call service
      return socialLoginService(request, sessionId);
    },
    onSuccess: (data) => {
      // Update auth store with session data
      setAuth(
        {
          id: data.user_id,
          phone: data.phone || '',
          email: data.email,
          isGuest: false,
          createdAt: new Date().toISOString(),
        },
        data.session_id, // session_id maps to token
        "" // no refresh token from this endpoint
      );
      
      logger.info("[Social Login Success]", { 
        userId: data.user_id,
        email: data.email,
        isNewUser: data.isNewUser 
      });
      
      // Socket connection happens automatically in central effect (app/providers.tsx)
      // DO NOT connect socket here
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[Social Login Error]", { message });
      
      // DO NOT show toast here - let UI handle it
      // DO NOT redirect here - let UI handle it
    },
  });
}
