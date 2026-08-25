"use client";

import { useMutation } from "@tanstack/react-query";
import { guestLogin } from "../api/guestLogin";
import { mapGuestLoginResponse } from "../model/mapper";
import { useAuthStore } from "@store/useAuthStore";
import { handleError } from "@lib/error/handler";
import { logger } from "@/lib/logger/logger";

/**
 * Hook for Guest Login
 * 
 * This demonstrates simple API usage WITHOUT service:
 * UI → Hook (React Query) → API → apiClient
 * 
 * NO service needed because:
 * - Single API call
 * - No orchestration
 * - No complex business logic
 */
export function useGuestLogin() {
  const { setGuestAuth } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const rawResponse = await guestLogin({ data: "data" });
      return mapGuestLoginResponse(rawResponse);
    },
    onSuccess: (data) => {
      // Update auth store with session_id as token and generate guest ID
      const guestId = `guest_${Date.now()}`;
      setGuestAuth(data.session_id, guestId);
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error("[Guest Login Error]", { message });
    },
  });
}
