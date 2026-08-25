/**
 * Auth Feature Types
 */

import { SocialProvider } from "@/types/global.types";
import type { ApiResponse } from "@lib/types/api.types";

export type { ApiResponse };

/**
 * Social Login Request with email
 */
export interface SocialLoginRequest {
  source: SocialProvider;
  token: string;
  email?: string; // Email extracted from token
}

export interface SocialLoginResponse {
  id: string;
  session_id: string;
  user_id: string;
  email?: string;
  phone?: string;
  isNewUser?: boolean; // Flag to indicate if this is a new user registration (status 201)
}

// ============================================
// Existing Types (OTP, etc.)
// ============================================

export interface CheckUserRequest {
  phone_code: string;
  phone: string;
  source: "phone" | "email";
}

export interface SendOtpRequest {
  phone_code: string;
  phone: string;
  is_register: boolean;
  source: "phone" | "email";
}

export interface VerifyOtpRequest {
  phone_code: string;
  phone: string;
  otp: string;
  is_register: boolean;
  source: "phone" | "email";
}

export interface VerifySpecialUserRequest {
  phone_code?: string;
  phone?: string;
  email?: string;
  is_register: boolean;
  source: "phone" | "email";
}

export interface GuestLoginRequest {
  data: string;
}

export interface CheckUserResponse {
  is_exists: boolean;
  is_special_user: boolean;
  operator_name: string | null;
}

export interface SendOtpResponse {
  otp_sent: boolean;
}

export interface VerifyOtpResponse {
  user: any;
  session_id: string;
  user_id: string;
  email?: string;
  phone: string;
  phone_code: string;
}

export interface VerifySpecialUserResponse {
  session_id: string;
  user_id: string;
  is_special_user: boolean;
  operator_name: string;
}

export interface GuestLoginResponse {
  session_id: string;
}

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatar?: string;
  isGuest: boolean;
  isSpecialUser?: boolean;
  operatorName?: string;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

export interface OtpFlowState {
  step: "check-user" | "send-otp" | "verify-otp" | "complete";
  phone: string;
  phoneCode: string;
  isSpecialUser: boolean;
  error: string | null;
}
