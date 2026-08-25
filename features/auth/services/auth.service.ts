/**
 * Auth Service
 * 
 * ONLY contains business logic and orchestration
 * NO React Query usage
 * NO UI/DOM access
 * 
 * Use service ONLY when orchestration is needed (multi-step flows)
 */

import { checkUser } from "../api/checkUser";
import { sendOtp } from "../api/sendOtp";
import { verifyOtp } from "../api/verifyOtp";
import { socialLogin } from "../api/socialLogin";
import { verifySpecialUser } from "../api/verifySpecialUser";
import { revokeSpecialUserSubscription } from "../api/revokeSpecialUserSubscription";
import {
  mapCheckUserResponse,
  mapSendOtpResponse,
  mapVerifyOtpResponse,
  mapSocialLoginResponse,
  mapVerifySpecialUserResponse,
} from "../model/mapper";
import { AppError } from "@lib/error/types";
import { HttpStatus } from "@enums/http.enum";
import type { ApiResponse, VerifyOtpResponse, SocialLoginRequest, SocialLoginResponse, VerifySpecialUserResponse } from "../model/types";
import { logger } from "@/lib/logger/logger";
import { LoginIdentifierType } from "@/enums/ui.enum";
import { analyticsService } from "@/shared/analytics";

export async function initiateOtpFlow(
  phone: string,
  phoneCode: string,
  sessionId?: string
): Promise<{ isSpecialUser: boolean; isExists: boolean; operatorName?: string | null }> {
  // Detect if input is email or phone
  const isEmail = phone.includes('@');
  const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;

  logger.info('[Auth Service] initiateOtpFlow', { phone, phoneCode, isEmail, source });

  // Step 1: Check user (raw response)
  // Handle 404 gracefully - it means user doesn't exist (new registration)
  let userCheckResponse: ApiResponse<any>;
  let isRegistration = false;
  let isSpecialUser = false;

  try {
    userCheckResponse = await checkUser({
      phone_code: phoneCode,
      phone: phone,
      source: source,
    }, sessionId) as ApiResponse<any>;

    // Step 2: Validate metaData status
    if (userCheckResponse.metaData?.status !== 200) {
      throw new AppError(
        userCheckResponse.metaData?.message || 'Check user failed',
        userCheckResponse.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Step 3: Map response
    const userCheck = mapCheckUserResponse(userCheckResponse);
    isRegistration = !userCheck.is_exists;
    isSpecialUser = userCheck.is_special_user;
    if (isSpecialUser) {
      logger.info('[Auth Service] Special User detected from checkUser. Bypassing sendOtp flow.', { operator_name: userCheck.operator_name });
      return { isSpecialUser: true, isExists: !isRegistration, operatorName: userCheck.operator_name };
    }
  } catch (error) {
    // Handle 404 - user doesn't exist, proceed with registration
    if (error instanceof AppError && error.status === HttpStatus.NOT_FOUND) {
      logger.info('[Auth Service] User not found (404), treating as new registration');
      isRegistration = true;
      isSpecialUser = false;
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  // Step 4: Log registration status
  if (isRegistration) {
    logger.info('[Auth Service] New user detected, sending OTP with is_register: true');
  } else {
    logger.info('[Auth Service] Existing user detected, sending OTP with is_register: false');
  }

  // Step 5: Send OTP (raw response) - for both existing and new users
  const otpResponse = await sendOtp({
    phone_code: phoneCode,
    phone: phone,
    is_register: isRegistration, // true for new users, false for existing
    source: source,
  }, sessionId) as ApiResponse<any>;

  // Step 6: Validate metaData status
  if (otpResponse.metaData?.status !== 200) {
    // DO NOT track otp_verified_failed here - this is a send failure, not a verification failure
    throw new AppError(
      otpResponse.metaData?.message || 'Send OTP failed',
      otpResponse.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  // Step 7: If metaData status is 200, consider it success even if data is null
  // Some APIs return data: null with success message
  const otp = mapSendOtpResponse(otpResponse);

  // Only check otp_sent if data was not null
  if (otpResponse.data !== null && !otp.otp_sent) {
    // DO NOT track otp_verified_failed here - this is a send failure, not a verification failure
    throw new AppError("Failed to send OTP", HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // Track login started (when user enters mobile/email and proceeds to OTP)
  analyticsService.trackLoginStarted({
    method: 'otp',
    value: phone,
    source_link: typeof window !== 'undefined' ? window.location.href : '',
  });

  // Track OTP requested successfully
  analyticsService.trackOtpRequested({
    phone: phone,
    phone_code: phoneCode,
    source: source,
  });

  return {
    isSpecialUser: isSpecialUser,
    isExists: !isRegistration, // Return actual is_exists value
  };
}

/**
 * Complete OTP Verification
 * 
 * Single step - verifies OTP and returns session
 * 
 * ANALYTICS:
 * - Triggers on ANY FAILURE: otp_verified_failed (invalid OTP, network error, timeout, etc.)
 * - Triggers on SUCCESS: otp_verified_success + login_completed
 * 
 * @param phone - User's phone number or email
 * @param phoneCode - Country phone code (empty string for email)
 * @param otp - OTP code
 * @param isRegister - Whether this is a registration flow
 * @param sessionId - Optional session ID
 * @returns Auth session data
 */
export async function completeOtpVerification(
  phone: string,
  phoneCode: string,
  otp: string,
  isRegister: boolean = false,
  sessionId?: string
): Promise<VerifyOtpResponse> {
  // Detect if input is email or phone
  const isEmail = phone.includes('@');
  const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;

  const startTime = Date.now();

  try {
    // Step 1: Verify OTP (raw response)
    const response = await verifyOtp({
      phone_code: phoneCode,
      phone: phone,
      otp: otp,
      is_register: isRegister,
      source: source,
    }, sessionId) as ApiResponse<any>;

    // Step 2: Validate metaData status
    // Accept both 200 (existing user) and 201 (new user registration)
    const status = response.metaData?.status;
    if (status !== 200 && status !== 201) {
      // Track OTP verification failure
      const failureReason = response.metaData?.message || 'OTP verification failed';
      logger.info('[Auth Service] OTP verification failed, tracking analytics', {
        status,
        reason: failureReason
      });
      
      analyticsService.trackOtpVerifiedFailed({
        reason: failureReason,
      });

      throw new AppError(
        response.metaData?.message || 'OTP verification failed',
        status as HttpStatus || HttpStatus.BAD_REQUEST
      );
    }

    // Step 3: Map response
    const mapped = mapVerifyOtpResponse(response);

    // Calculate verification time
    const verificationTime = Math.floor((Date.now() - startTime) / 1000);

    // Track OTP verification success
    analyticsService.trackOtpVerifiedSuccess({
      user_id: mapped.user_id || (mapped?.user?.id != null ? String(mapped.user.id) : undefined),
    });

    // Track login completed
    analyticsService.trackLoginCompleted({
      user_id: mapped.user_id || (mapped?.user?.id != null ? String(mapped.user.id) : ''),
      session_id: mapped.session_id,
      method: 'otp',
      value: mapped.phone || phone,
      phoneOnly: mapped.phone || phone,
      phoneCode: mapped.phone_code || phoneCode,
      otp: otp,
      source_link: typeof window !== 'undefined' ? window.location.href : '',
    });

    return mapped;
  } catch (error) {
    // Track OTP verification failure for any error (network, timeout, invalid OTP, etc.)
    const failureReason = error instanceof AppError 
      ? error.message 
      : (error as any)?.message || 'OTP verification failed';
    
    logger.info('[Auth Service] OTP verification error caught, tracking analytics', {
      error: failureReason
    });
    
    analyticsService.trackOtpVerifiedFailed({
      reason: failureReason,
    });

    // Re-throw the error for the UI to handle
    throw error;
  }
}

/**
 * Social Login Service
 * 
 * Simple orchestration - just calls API
 * 
 * @param request - Social login request
 * @param sessionId - Optional session ID
 * @returns Social login response with isNewUser flag
 */
export async function socialLoginService(
  request: SocialLoginRequest,
  sessionId?: string
): Promise<SocialLoginResponse> {
  // Step 1: Call social login API
  const response = await socialLogin(request, sessionId) as ApiResponse<any>;

  // Step 2: Validate metaData status
  // Accept both 200 (existing user) and 201 (new user registration)
  const status = response.metaData?.status;
  if (status !== 200 && status !== 201) {
    // Track login failure (log only, no matching event in defined list)
    logger.warn('[Auth Service] Social login failed', {
      status,
      message: response.metaData?.message,
    });

    throw new AppError(
      response.metaData?.message || 'Social login failed',
      status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  // Step 3: Map response
  const mapped = mapSocialLoginResponse(response);

  // Step 4: Add isNewUser flag based on status code
  const isNewUser = status === 201;

  // Step 5: Log the status for debugging
  if (isNewUser) {
    logger.info('[Auth Service] New user registered via social login');
  } else {
    logger.info('[Auth Service] Existing user logged in via social login');
  }

  // Track login completed
  analyticsService.trackLoginCompleted({
    user_id: mapped?.id || mapped?.user_id || '',
    session_id: mapped?.session_id || '',
    method: request.source as string,
    value: mapped?.email || mapped?.phone || '',
    source_link: typeof window !== 'undefined' ? window.location.href : '',
  });

  return {
    ...mapped,
    isNewUser,
  };
}

export async function completeSpecialUserVerification(
  phone: string,
  phoneCode: string,
  isRegister = false,
  sessionId?: string
): Promise<VerifySpecialUserResponse & { email?: string; phone: string }> {
  const isEmail = phone.includes('@');
  const source = isEmail ? LoginIdentifierType.EMAIL : LoginIdentifierType.PHONE;

  logger.info('[Auth Service] completeSpecialUserVerification', { phone, phoneCode, isEmail, source, isRegister });

  const response = await verifySpecialUser({
    phone_code: phoneCode,
    phone: phone,
    email: isEmail ? phone : undefined,
    is_register: isRegister,
    source: source,
  }, sessionId);

  if (response.metaData?.status !== 200 && response.metaData?.status !== 201) {
    throw new AppError(
      response.metaData?.message || 'Special user verification failed',
      response.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  const mapped = mapVerifySpecialUserResponse(response);

  // Track login completed
  analyticsService.trackLoginCompleted({
    user_id: mapped?.user_id || '',
    session_id: mapped?.session_id || '',
    method: source,
    value: phone,
    source_link: typeof window !== 'undefined' ? window.location.href : '',
  });

  return {
    ...mapped,
    email: isEmail ? phone : undefined,
    phone: isEmail ? '' : phone,
  };
}

export async function cancelSpecialUserSubscriptionService(
  payload: { email?: string; phone?: string; phone_code?: string },
  sessionId?: string
): Promise<any> {
  logger.info('[Auth Service] cancelSpecialUserSubscriptionService', payload);
  const response = await revokeSpecialUserSubscription(payload, sessionId);

  if (response.metaData?.status !== 200 && response.metaData?.status !== 201) {
    throw new AppError(
      response.metaData?.message || 'Subscription revocation failed',
      response.metaData?.status as HttpStatus || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  return response.data;
}
