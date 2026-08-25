/**
 * HTTP header constants
 * Simple, flat structure for easy access
 */
export const HEADERS = {
  // Standard headers
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  ACCEPT: "Accept",

  // Content types
  JSON: "application/json",
  MULTIPART: "multipart/form-data",

  // Custom headers (keys)
  DEVICE_TYPE_CODE: "deviceTypeCode",
  DEVICE_ID: "deviceID",
  LANGUAGE: "language",
  APP_VERSION: "appversion",
  PROJECT: "project",
  SESSION_ID: "sessionid",
} as const;

/**
 * Default header values
 */
export const DEFAULT_HEADER_VALUES = {
  DEVICE_TYPE_CODE: "3", // 3 = Web
  LANGUAGE: "1", // 1 = English
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || "2.0.0",
  PROJECT: "JOJO",
} as const;
