/**
 * Auth Module Mappers
 * Transforms API responses to UI models
 */

import type {
  ApiResponse,
  CheckUserResponse,
  SendOtpResponse,
  VerifyOtpResponse,
  VerifySpecialUserResponse,
  GuestLoginResponse,
  User,
} from "./types";

/**
 * Maps API user response to domain User model
 */
export function mapUser(apiUser: any): User {
  return {
    id: apiUser.user_id || apiUser.id || '',
    phone: apiUser.phone || '',
    name: apiUser.name || apiUser.fullName,
    email: apiUser.email,
    avatar: apiUser.avatar || apiUser.profilePicture,
    isGuest: apiUser.isGuest || false,
    createdAt: apiUser.createdAt || new Date().toISOString(),
  };
}

/**
 * Maps check user API response
 */
export function mapCheckUserResponse(apiResponse: ApiResponse<any>): CheckUserResponse {
  const data = apiResponse.data;
  
  return {
    is_exists: data?.is_exists || false,
    is_special_user: data?.is_special_user || false,
    operator_name: data?.operator_name || null,
  };
}

/**
 * Maps send OTP API response
 */
export function mapSendOtpResponse(apiResponse: ApiResponse<any>): SendOtpResponse {
  const data = apiResponse.data;
  
  return {
    otp_sent: data?.otp_sent || false,
  };
}

/**
 * Maps verify OTP API response
 */
export function mapVerifyOtpResponse(apiResponse: ApiResponse<any>): VerifyOtpResponse {
  const data = apiResponse.data;
  
  return {
    user: data?.user || null,
    session_id: data?.session_id || '',
    user_id: data?.user_id || '',
    email: data?.email,
    phone: data?.phone || '',
    phone_code: data?.phone_code || '',
  };
}

/**
 * Maps verify special user API response
 */
export function mapVerifySpecialUserResponse(
  apiResponse: ApiResponse<any>
): VerifySpecialUserResponse {
  const data = apiResponse.data;
  
  return {
    session_id: data?.session_id || '',
    user_id: data?.user_id || '',
    is_special_user: data?.is_special_user || false,
    operator_name: data?.operator_name || '',
  };
}

/**
 * Maps guest login API response
 */
export function mapGuestLoginResponse(apiResponse: ApiResponse<any>): GuestLoginResponse {
  const data = apiResponse.data;
  
  return {
    session_id: data?.session_id || '',
  };
}


/**
 * Map Social Login Response
 */
export function mapSocialLoginResponse(apiResponse: ApiResponse<any>): import("./types").SocialLoginResponse {
  const data = apiResponse.data;
  
  return {
    id: data?.id || data?.user_id || '',
    session_id: data?.session_id || '',
    user_id: data?.user_id || '',
    email: data?.email,
    phone: data?.phone,
  };
}
