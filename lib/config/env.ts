/**
 * Environment Configuration (Entry Point)
 * 
 * RULES:
 * - ONLY place where process.env is accessed
 * - Provides default fallbacks for static export (LG webOS TV)
 */

export const env = {
  configUrl: process.env.NEXT_PUBLIC_CONFIG_URL || "https://api.superott.in/app-config",
  secretKey: process.env.NEXT_PUBLIC_SECRET_KEY || "sBYDzGabIR2aEPagELKBN41kIR7xBm1G5emAODCCLl0=",
  ivKey: process.env.NEXT_PUBLIC_SECRET_IV || "2d8f2f3bfb6a2e6d129f3eaf4ef104d0",
  
  // Development mode flags
  skipConfig: process.env.NEXT_PUBLIC_SKIP_CONFIG === "true",
  
  // Fallback config (used if skipConfig=true or fetch fails)
  fallbackApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.superott.in",
  fallbackSocketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || "wss://socket.superott.in",
  fallbackEnvType: (process.env.NEXT_PUBLIC_ENV_TYPE || "stage") as "stage" | "prod",
  
  // reCAPTCHA v3
  recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
};
