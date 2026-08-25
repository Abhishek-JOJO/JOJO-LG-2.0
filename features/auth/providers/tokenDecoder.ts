/**
 * Token Decoder Utility
 * 
 * Decodes JWT tokens to extract email and other claims
 * Used for Google and Apple ID tokens
 */

import { logger } from '@/lib/logger/logger';

interface DecodedToken {
  email?: string;
  sub?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

/**
 * Decode JWT token (without verification)
 * 
 * Note: This only decodes the token to extract claims.
 * Token verification happens on the backend.
 * 
 * @param token - JWT token string
 * @returns Decoded token payload
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      logger.error('[Token Decoder] Invalid JWT format');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Base64 decode
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    
    // Parse JSON
    return JSON.parse(decoded);
  } catch (error) {
    logger.error('[Token Decoder] Failed to decode token', { error });
    return null;
  }
}

/**
 * Extract email from token
 * 
 * @param token - JWT token or access token
 * @param provider - Provider name (for logging)
 * @returns Email address or null
 */
export function extractEmailFromToken(token: string, provider: string): string | null {
  // For JWT tokens (Google, Apple)
  const decoded = decodeJWT(token);
  
  if (decoded?.email) {
    // Check if the "email" is actually a phone number
    // Phone numbers in email field typically look like: +919876543210 or just numbers
    const emailValue = decoded.email;
    const isPhoneNumber = /^[\d+\-\s()]+$/.test(emailValue) || /^\+?\d{10,15}$/.test(emailValue);
    
    if (isPhoneNumber) {
      logger.warn(`[Token Decoder] Phone number detected in email field for ${provider}`, {
        value: emailValue.substring(0, 3) + '***' // Log only first 3 chars for privacy
      });
      return null; // Return null to indicate no valid email
    }
    
    return decoded.email;
  }

  logger.warn(`[Token Decoder] No email found in ${provider} token`);
  return null;
}

/**
 * Check if token contains a phone number instead of email
 * 
 * @param token - JWT token
 * @returns true if phone number detected, false otherwise
 */
export function hasPhoneNumberInsteadOfEmail(token: string): boolean {
  const decoded = decodeJWT(token);
  
  if (decoded?.email) {
    const emailValue = decoded.email;
    // Check if it's a phone number pattern
    return /^[\d+\-\s()]+$/.test(emailValue) || /^\+?\d{10,15}$/.test(emailValue);
  }
  
  return false;
}
