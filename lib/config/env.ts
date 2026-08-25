/**
 * Environment Configuration (Entry Point)
 * 
 * RULES:
 * - ONLY place where process.env is accessed
 * - ONLY stores: configUrl and crypto keys
 * - DO NOT store apiBaseUrl here (comes from runtime config)
 */

export const env = {
  configUrl: process.env.NEXT_PUBLIC_CONFIG_URL!,
  secretKey: process.env.NEXT_PUBLIC_SECRET_KEY!,
  ivKey: process.env.NEXT_PUBLIC_SECRET_IV!,
  
  // Development mode flags
  skipConfig: process.env.NEXT_PUBLIC_SKIP_CONFIG === "true",
  
  // Fallback config (used if skipConfig=true or fetch fails)
  fallbackApiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  fallbackSocketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || "",
  fallbackEnvType: (process.env.NEXT_PUBLIC_ENV_TYPE || "stage") as "stage" | "prod",
  
  // reCAPTCHA v3
  recaptchaSiteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "",
} as const;

// Validation (fail fast in development)
if (typeof window === "undefined") {
  if (!env.skipConfig && !env.configUrl) {
    throw new Error("NEXT_PUBLIC_CONFIG_URL is required (or set NEXT_PUBLIC_SKIP_CONFIG=true)");
  }
  if (!env.skipConfig && !env.secretKey) {
    throw new Error("NEXT_PUBLIC_SECRET_KEY is required");
  }
  if (!env.skipConfig && !env.ivKey) {
    throw new Error("NEXT_PUBLIC_SECRET_IV is required");
  }
}
