// enums/ui.enum.ts

import { appConfig } from "@/lib/config/app.config";

// ---------------- UI STATE ----------------
// Use ONLY for local UI (not API state handled by React Query)
export enum UIState {
  INITIAL = "initial",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
  EMPTY = "empty", // success but no data
}

// ---------------- MODALS ----------------
// Keep explicit naming to avoid confusion at scale
export enum ModalId {
  LOGIN = "login",
  LOGOUT_CONFIRM = "logout_confirm",
  SHARE_VIDEO = "share_video",
}

export const SUPPORTED_LOCALES = [appConfig.ENGLISH_LANGUAGE_CODE, appConfig.GUJRATI_LANGUAGE_CODE] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  gu: "ગુજરાતી",
};

// ---------------- REGISTER ----------------
export enum AgeRange {
  AGE_18_24 = "18-24",
  AGE_25_29 = "25-29",
  AGE_30_34 = "30-34",
  AGE_35_39 = "35-39",
  AGE_40_49 = "40-49",
  AGE_50_PLUS = "50+",
}

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHERS = "others",
}

export const GENDER_LABEL_KEY = {
  [Gender.MALE]: "gender_male",
  [Gender.FEMALE]: "gender_female",
  [Gender.OTHERS]: "gender_others",
};

export const AGE_RANGES = Object.values(AgeRange);
export const GENDERS = Object.values(Gender);
export const DEFAULT_LOCALE: Locale = "en";

// export enum ErrorKey {
//   REQUIRED = "error_required",
//   INVALID_EMAIL = "error_invalid_email",
//   INVALID_PHONE = "error_invalid_phone",
//   ERR_INVALID = "error_invalid",
//   ERR_EXPIRED = "error_expired",
//   ERR_AGE_REQUIRED = "error_age_required",
//   ERR_GENDER_REQUIRED = "error_gender_required",
//   ERR_NAME_REQUIRED = "error_name_required",
//   ERR_NAME_INVALID = "error_name_invalid",
//   ERR_NAME_TOO_LONG = "error_name_too_long",
//   USER_NOT_FOUND = "error_user_not_found",
//   USER_ALREADY_EXISTS = "error_user_already_exists",
//   NO_EMAIL_FOUND_IN_GOOGLE_TOKEN = 'No email found in Google token',
//   NO_EMAIL_FOUND_IN_FACEBOOK_RESPONCE = 'No email found in Facebook response',
//   APPLE_LOGIN_CAN_ONLY_BE_USED_IN_BROWSER = 'Apple login can only be used in browser'
// }

export enum ErrorKey {
  REQUIRED = "error_required",
  INVALID_EMAIL = "error_invalid_email",
  INVALID_PHONE = "error_invalid_phone",
  ERR_INVALID = "error_invalid",
  ERR_EXPIRED = "error_expired",
  ERR_AGE_REQUIRED = "error_age_required",
  ERR_GENDER_REQUIRED = "error_gender_required",
  ERR_NAME_REQUIRED = "error_name_required",
  ERR_NAME_INVALID = "error_name_invalid",
  ERR_NAME_TOO_LONG = "error_name_too_long",
  USER_NOT_FOUND = "error_user_not_found",
  USER_ALREADY_EXISTS = "error_user_already_exists",
  NO_EMAIL_FOUND_IN_GOOGLE_TOKEN = 'No email found in Google token',
  NO_EMAIL_FOUND_IN_FACEBOOK_RESPONCE = 'No email found in Facebook response',
  APPLE_LOGIN_CAN_ONLY_BE_USED_IN_BROWSER = 'Apple login can only be used in browser',
  NETWORK_ERROR = "error_network",
  SERVER_ERROR = "error_server",
  TIMEOUT_ERROR = "error_timeout",
  UNKNOWN_ERROR = "error_unknown",
  ERR_TOO_MANY_REQUESTS = "error_too_many_requests"
}

export enum LoginIdentifierType {
  PHONE = "phone",
  EMAIL = "email",
  OTP = "otp",
  PHONE_CODE = "phoneCode",
  PHONE_CODE_NUMBER_DEFAULT = "+91"
}

export enum OTPScreenMode {
  LOGIN_MODE = "login",
  REGISTER_MODE = "register"
}

export enum OtpDeliveryMethod {
  CALL = "call",
  SMS = "sms",
  altSMS = "SMS",
  altCall = "Call"
}

export enum SocialMediaMethos {
  FACEBOOK = 'facebook',
  APPLE = 'apple',
  GOOGLE = 'google'
}

export enum PermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied'
}

export enum ErrorMessage {
  SECURITY_VALIDATION_FAILED = "Security validation failed",
  NO_AUTHENTICATION_TOKEN_RECEIVED = "No authentication token received",
  NO_EMAIL_FOUND_IN_APPLE_RESPONSE = "No email found in Apple response",
  FAILED_TO_COMPLETE_SIGN_IN = "Failed to complete sign-in",
  APPLE_SIGN_IN_WAS_CANCELLED_OR_FAILED = "Apple sign-in was cancelled or failed",

  FEATURE_NOT_SUPPORTED_ON_DEVICE = "This feature is not supported on your device.",
  PERMISSION_DENIED_ENABLE_IN_BROWSER = "Permission denied. Please enable it in browser settings.",
  FAILED_TO_REQUEST_PERMISSION = "Failed to request permission",
}

export enum LikeLovePartHerocarousel {
  LIKE = "like",
  LOVE = "love",
  DISLIKE = "dislike"
}