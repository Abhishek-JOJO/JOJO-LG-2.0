"use client";

import { useMutation } from "@tanstack/react-query";
import { initiateOtpFlow, completeOtpVerification, completeSpecialUserVerification, cancelSpecialUserSubscriptionService } from "../services/auth.service";
import { checkUser } from "../api/checkUser";
import { mapCheckUserResponse } from "../model/mapper";
import { useAuthStore } from "@store/useAuthStore";
import { handleError } from "@lib/error/handler";
import { logger } from "@/lib/logger/logger";
import { LoginIdentifierType } from "@/enums/ui.enum";
import { AppError } from "@/lib/error/types";
import { HttpStatus } from "@/enums/http.enum";

/**
 * Hook for OTP Login Flow
 * 
 * RULES:
 * - Hook ONLY uses React Query
 * - Hook ONLY calls service
 * - NO business logic in hook
 * - Service handles orchestration
 * - Socket connection happens in central effect (NOT here)
 * 
 * This demonstrates the pattern:
 * UI → Hook (React Query) → Service (orchestration) → API → apiClient
 */

/**
 * Check if user exists (for overseas users on login page)
 * Returns user existence status without sending OTP
 */
export function useCheckUserExists() {
  return useMutation({
    mutationFn: async ({ phone, phoneCode }: { phone: string; phoneCode: string }) => {
      const sessionId = useAuthStore.getState().token ?? undefined;
      const isEmail = phone.includes('@');
      const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;
      
      try {
        const response = await checkUser({
          phone_code: phoneCode,
          phone: phone,
          source: source,
        }, sessionId);
        
        // If we get here, user exists
        const userCheck = mapCheckUserResponse(response);
        return {
          exists: userCheck.is_exists,
          isSpecialUser: userCheck.is_special_user,
          identifier: phone,
          phoneCode: phoneCode
        };
      } catch (error) {
        // Handle 404 - user doesn't exist
        if (error instanceof AppError && error.status === HttpStatus.NOT_FOUND) {
          return {
            exists: false,
            isSpecialUser: false,
            identifier: phone,
            phoneCode: phoneCode
          };
        }
        // Re-throw other errors
        throw error;
      }
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[Check User Error]", { message });
    },
  });
}

/**
 * Initiate OTP flow (send OTP)
 */
export function useInitiateOtp() {
  return useMutation({
    mutationFn: ({ phone, phoneCode }: { phone: string; phoneCode: string }) => {
      // Get session from store (hook layer can access store)
      const sessionId = useAuthStore.getState().token ?? undefined;

      // Pass session to service
      return initiateOtpFlow(phone, phoneCode, sessionId);
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[OTP Initiate Error]", { message });
    },
  });
}

/**
 * Complete OTP verification
 */
export function useVerifyOtp() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: ({
      phone,
      phoneCode,
      otp,
      isRegister = false,
    }: {
      phone: string;
      phoneCode: string;
      otp: string;
      isRegister?: boolean;
    }) => {
      // Get session from store
      const sessionId = useAuthStore.getState().token ?? undefined;

      // Pass session to service with isRegister flag
      return completeOtpVerification(phone, phoneCode, otp, isRegister, sessionId);
    },
    onSuccess: (data) => {
      // Update auth store with session_id as token
      setAuth(
        {
          id: data.user_id,
          phone: data.phone,
          email: data.email,
          isGuest: false,
          createdAt: new Date().toISOString(),
        },
        data.session_id, // session_id maps to token
        "" // no refresh token
      );

      // Socket connection happens automatically in central effect (app/providers.tsx)
      // DO NOT connect socket here
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[OTP Verify Error]", { message });
    },
  });
}

/**
 * Resend OTP
 */
export function useResendOtp() {
  return useMutation({
    mutationFn: ({ phone, phoneCode }: { phone: string; phoneCode: string }) => {
      // Get session from store
      const sessionId = useAuthStore.getState().token ?? undefined;

      // Reuse the same initiateOtpFlow service
      return initiateOtpFlow(phone, phoneCode, sessionId);
    },
    onSuccess: () => {
      logger.info("[OTP Resend Success]");
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[OTP Resend Error]", { message });
    },
  });
}

/**
 * Complete Special User Verification
 */
export function useVerifySpecialUser() {
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: ({
      phone,
      phoneCode,
      isRegister = false,
    }: {
      phone: string;
      phoneCode: string;
      isRegister?: boolean;
    }) => {
      const sessionId = useAuthStore.getState().token ?? undefined;
      return completeSpecialUserVerification(phone, phoneCode, isRegister, sessionId);
    },
    onSuccess: (data) => {
      setAuth(
        {
          id: data.user_id,
          phone: data.phone || "",
          email: data.email,
          isGuest: false,
          isSpecialUser: true,
          operatorName: data.operator_name,
          createdAt: new Date().toISOString(),
        },
        data.session_id,
        ""
      );
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[Special User Verify Error]", { message });
    },
  });
}

/**
 * Revoke Special User Subscription
 */
export function useRevokeSpecialUserSubscription() {
  return useMutation({
    mutationFn: (payload: { email?: string; phone?: string; phone_code?: string }) => {
      const sessionId = useAuthStore.getState().token ?? undefined;
      return cancelSpecialUserSubscriptionService(payload, sessionId);
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[Revoke Special User Subscription Error]", { message });
    },
  });
}
