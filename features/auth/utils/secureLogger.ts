/**
 * Secure Logger Utility
 * 
 * Sanitizes sensitive data before logging to prevent:
 * - OTP codes from appearing in logs
 * - Passwords in error messages
 * - Session tokens in debug logs
 * - Personal identifiable information (PII)
 * 
 * Production-ready logging for sensitive operations
 */

import { logger } from "@/lib/logger/logger";

// Sensitive field names to sanitize
const SENSITIVE_FIELDS = [
  "otp",
  "password",
  "token",
  "session_id",
  "sessionid",
  "refresh_token",
  "access_token",
  "bearer",
  "authorization",
  "api_key",
  "apikey",
  "secret",
  "cvv",
  "card_number",
  "cardnumber",
];

// Fields to partially mask (show first/last chars only)
const PARTIAL_MASK_FIELDS = [
  "phone",
  "email",
];

/**
 * Recursively sanitize an object by removing/masking sensitive fields
 */
function sanitizeObject(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return "[Max depth reached]";
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== "object") return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Remove sensitive fields entirely
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = "[REDACTED]";
      continue;
    }
    
    // Partially mask certain fields
    if (PARTIAL_MASK_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = maskValue(value as string);
      continue;
    }
    
    // Recursively sanitize nested objects
    if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Mask a value (show first 2 and last 2 characters)
 */
function maskValue(value: string): string {
  if (typeof value !== "string" || value.length <= 4) {
    return "***";
  }
  
  const first = value.substring(0, 2);
  const last = value.substring(value.length - 2);
  const masked = "*".repeat(Math.min(value.length - 4, 6));
  
  return `${first}${masked}${last}`;
}

/**
 * Secure logger for OTP operations
 */
export const secureLogger = {
  /**
   * Log OTP attempt (success or failure)
   * NEVER logs actual OTP value
   */
  logOtpAttempt: (success: boolean, metadata?: Record<string, any>) => {
    const sanitized = metadata ? sanitizeObject(metadata) : {};
    
    if (success) {
      logger.info("[OTP] Verification succeeded", sanitized);
    } else {
      logger.warn("[OTP] Verification failed", sanitized);
    }
  },

  /**
   * Log OTP request (send OTP)
   */
  logOtpRequest: (metadata?: Record<string, any>) => {
    const sanitized = metadata ? sanitizeObject(metadata) : {};
    logger.info("[OTP] OTP requested", sanitized);
  },

  /**
   * Log OTP resend
   */
  logOtpResend: (metadata?: Record<string, any>) => {
    const sanitized = metadata ? sanitizeObject(metadata) : {};
    logger.info("[OTP] OTP resent", sanitized);
  },

  /**
   * Log sensitive error (removes sensitive data from error object)
   */
  logSensitiveError: (context: string, error: any, metadata?: Record<string, any>) => {
    const sanitizedError = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          // Don't log stack trace in production
          ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
        }
      : { type: typeof error, error: String(error) };

    const sanitizedMeta = metadata ? sanitizeObject(metadata) : {};

    logger.error(`[${context}] Error occurred`, {
      ...sanitizedError,
      ...sanitizedMeta,
    });
  },

  /**
   * Log security event (rate limit, lockout, etc.)
   */
  logSecurityEvent: (event: string, metadata?: Record<string, any>) => {
    const sanitized = metadata ? sanitizeObject(metadata) : {};
    logger.warn(`[Security] ${event}`, sanitized);
  },

  /**
   * Debug log (only in development)
   */
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      const sanitized = data ? sanitizeObject(data) : undefined;
      logger.debug(message, sanitized);
    }
  },
};

/**
 * Sanitize data for display in UI error messages
 * (More aggressive than logging - removes all PII)
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove any patterns that look like OTP codes (4-8 digits)
  let sanitized = message.replace(/\b\d{4,8}\b/g, "****");
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]");
  
  // Remove phone numbers (various formats)
  sanitized = sanitized.replace(/[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}/g, "[phone]");
  
  return sanitized;
}
