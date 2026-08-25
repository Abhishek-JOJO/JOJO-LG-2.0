/**
 * Auth Event Types
 * 
 * Authentication and authorization event definitions
 */

export interface LoginSuccessEvent {
  method: 'otp' | 'google' | 'facebook' | 'apple' | 'guest';
  is_new_user: boolean;
  phone_code?: string;
  source: 'phone' | 'email';
}

export interface LoginFailedEvent {
  method: 'otp' | 'google' | 'facebook' | 'apple';
  error_code: string;
  error_message: string;
  source: 'phone' | 'email';
}

export interface OtpSentEvent {
  phone_code?: string;
  source: 'phone' | 'email';
  is_register: boolean;
}

export interface OtpVerifiedEvent {
  phone_code?: string;
  source: 'phone' | 'email';
  is_register: boolean;
  verification_time_seconds: number;
}

export interface OtpFailedEvent {
  phone_code?: string;
  source: 'phone' | 'email';
  error_code: string;
  error_message: string;
  attempts: number;
}

export interface LogoutEvent {
  reason?: 'user_initiated' | 'session_expired' | 'token_invalid';
}
