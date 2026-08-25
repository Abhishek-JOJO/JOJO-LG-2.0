"use client";

import { useMutation } from "@tanstack/react-query";
import { verifyCaptchaFlow } from "../services/captcha.service";
import { RecaptchaAction } from "@/shared/recaptcha/recaptcha.types";
import { useAuthStore } from "@store/useAuthStore";
import { handleError } from "@lib/error/handler";
import { logger } from "@/lib/logger/logger";

/**
 * Hook for Captcha Verification
 * 
 * RULES:
 * - Hook ONLY uses React Query
 * - Hook ONLY calls service
 * - NO business logic in hook
 * - Service handles orchestration
 * - NO toast/UI logic here
 * 
 * Pattern:
 * UI → Hook (React Query) → Service (orchestration) → API → apiClient
 */

/**
 * Verify captcha
 * 
 * @returns Mutation hook for captcha verification
 */
export function useCaptcha() {
    return useMutation({
        mutationFn: ({ action }: { action: RecaptchaAction }) => {
            // Get session from store (hook layer can access store)
            const sessionId = useAuthStore.getState().token ?? undefined;

            logger.info("[Captcha Hook] Session token:", sessionId ? "Present" : "Not present");

            // Pass session to service
            return verifyCaptchaFlow(action, sessionId);
        },
        onSuccess: (data) => {
            logger.info("[Captcha Verify Success]", { message: data.message });
        },
        onError: (error) => {
            const message = handleError(error);
            logger.error("[Captcha Verify Error]", { message });
        },
    });
}