/**
 * Captcha Service
 * 
 * ONLY contains orchestration logic
 * NO React Query usage
 * NO UI/DOM access
 * 
 * Orchestrates: executeRecaptcha → verifyCaptcha API → return backend result
 */

import { executeRecaptcha } from "@/shared/recaptcha/recaptcha.client";
import { verifyCaptcha } from "../api/verifyCaptcha";
import { RecaptchaAction } from "@/shared/recaptcha/recaptcha.types";
import { AppError } from "@lib/error/types";
import { HttpStatus } from "@enums/http.enum";
import { logger } from "@/lib/logger/logger";

/**
 * Verify Captcha Flow
 * 
 * Orchestrates:
 * 1. Execute reCAPTCHA to get token from Google
 * 2. Send token to backend for verification
 * 3. Return backend decision (backend owns all validation logic)
 * 
 * @param action - The action being performed (REGISTER, LOGIN, etc.)
 * @param sessionId - Optional session ID
 * @returns Backend verification result
 */
export async function verifyCaptchaFlow(
  action: RecaptchaAction,
  sessionId?: string
): Promise<{ success: boolean; message?: string }> {
  logger.info('[Captcha Service] Starting verification flow', {
    action,
    hasSessionId: !!sessionId
  });
  logger.info('[Captcha Service] 🔄 Starting verification', {
    action,
    hasSessionId: !!sessionId
  });

  try {
    // Step 1: Execute reCAPTCHA to get token from Google
    logger.info('[Captcha Service] Executing reCAPTCHA...');
    const token = await executeRecaptcha(action);

    if (!token) {
      logger.error('[Captcha Service] Failed to get token from Google');
      throw new AppError(
        'Failed to verify captcha. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    logger.info('[Captcha Service] Token received from Google', { tokenLength: token.length });


    // Step 2: Send token to backend for verification
    logger.info('[Captcha Service] Sending token to backend...', {
      hasSessionId: !!sessionId,
      sessionIdPreview: sessionId ? sessionId.substring(0, 10) + '...' : 'none'
    });


    const response = await verifyCaptcha(
      {
        token,
        action,
      },
      sessionId
    );

    // Step 3: Validate metaData status
    if (response.metaData?.status !== 200) {
      logger.error('[Captcha Service] Backend verification failed', {
        status: response.metaData?.status,
        message: response.metaData?.message,
      });
      throw new AppError(
        response.metaData?.message || 'Captcha verification failed',
        response.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Step 4: Backend returned 200 status - captcha is verified
    // Backend returns data: null with success message in metaData
    logger.info('[Captcha Service] Verification successful', {
      message: response.metaData?.message
    });


    return {
      success: true,
      message: response.metaData?.message,
    };
  } catch (error) {
    logger.error('[Captcha Service] Verification flow failed', { error });

    throw error;
  }
}