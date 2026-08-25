/**
 * Decrypt Socket Response
 * Utility to decrypt and parse encrypted Socket.IO responses.
 * 
 * The socket `res` event returns a doubly-nested encrypted structure:
 *   { data: { data: "encryptedHexString" } }
 * 
 * This utility handles:
 * 1. Double-nested data (response.data.data is the encrypted string)
 * 2. Single-nested data (response.data is the encrypted string)
 * 3. Already-decrypted plain objects
 */

import { decrypt } from "@/lib/crypto/decrypt";
import { logger } from "@lib/logger/logger";

export function decryptSocketData(response: any): any {
  if (!response) return null;

  // Find the deepest encrypted string in the nested data structure
  let encryptedPayload: string | null = null;

  if (typeof response === 'string') {
    encryptedPayload = response;
  } else if (typeof response?.data === 'string') {
    // Single nesting: { data: "encrypted..." }
    encryptedPayload = response.data;
  } else if (typeof response?.data?.data === 'string') {
    // Double nesting: { data: { data: "encrypted..." } }
    encryptedPayload = response.data.data;
  }

  if (encryptedPayload) {
    try {
      logger.info('[Socket] Decrypting socket response payload', { 
        length: encryptedPayload.length 
      });
      const decrypted = decrypt(encryptedPayload, true);
      if (decrypted) {
        const parsed = JSON.parse(decrypted);
        logger.info('[Socket] Successfully decrypted socket response', { 
          eventName: parsed?.en,
          keys: Object.keys(parsed || {}).slice(0, 5),
        });
        return parsed;
      }
    } catch (err) {
      logger.warn('[Socket] Failed to decrypt socket response', { err });
      // Try parsing as plain JSON
      try {
        return JSON.parse(encryptedPayload);
      } catch {
        logger.error('[Socket] Failed to parse socket response as JSON');
      }
    }
  }

  // If response is already a parsed object (no encrypted data field), return as-is
  if (typeof response === 'object' && response !== null) {
    logger.info('[Socket] Socket response is already a plain object', { 
      keys: Object.keys(response).slice(0, 5) 
    });
    return response;
  }

  return response;
}
