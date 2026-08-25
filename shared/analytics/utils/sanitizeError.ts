/**
 * Error Sanitization Utility
 * 
 * SECURITY: Never send raw error.stack to analytics providers.
 * This can expose sensitive internals, PII, and exceed payload limits.
 */

import type { ErrorOccurredEvent } from '../model/common.types';

/**
 * Sanitize error for analytics tracking
 * 
 * Extracts only safe, non-sensitive error information
 */
export function sanitizeError(
  error: Error | unknown,
  context?: {
    screen_name?: string;
    component_name?: string;
  }
): ErrorOccurredEvent {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  return {
    error_type: errorObj.name || 'Error',
    error_code: (errorObj as any).code || undefined,
    error_message: errorObj.message || 'Unknown error',
    screen_name: context?.screen_name,
    component_name: context?.component_name,
  };
}

/**
 * Generate a short error fingerprint (optional)
 * 
 * Creates a hash-like identifier without exposing stack details
 */
export function generateErrorFingerprint(error: Error): string {
  const str = `${error.name}:${error.message}`;
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `err_${Math.abs(hash).toString(36)}`;
}
