
/**
 * reCAPTCHA v3 Types
 * 
 * Type definitions for Google reCAPTCHA v3 integration
 */

// Extend Window interface for grecaptcha
declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

/**
 * reCAPTCHA Actions
 * Define all possible actions for reCAPTCHA verification
 */
export enum RecaptchaAction {
  REGISTER = 'register',
  LOGIN = 'login',
  OTP_SUBMIT = 'otp_submit',
  CREATE_PROFILE = 'create_profile',
}

/**
 * Request payload for backend verification
 */
export interface RecaptchaVerifyRequest {
  token: string;
  action: string;
}

/**
 * Response from backend verification
 * Backend owns score validation and decision logic
 */
export interface RecaptchaVerifyResponse {
  success: boolean;
  message?: string;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export {};



