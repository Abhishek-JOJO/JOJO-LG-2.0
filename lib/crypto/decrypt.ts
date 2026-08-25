import CryptoJS from "crypto-js";
import { env } from "@lib/config/env";
import { logger } from "@lib/logger/logger";

/**
 * Decrypts a value using AES decryption
 * Used ONLY in API client for response decryption and config decryption
 *
 * Flow:
 * 1. Secret Key: base64 → WordArray
 * 2. IV: hex → WordArray
 * 3. Ciphertext: hex → WordArray
 * 4. Decrypt using AES-CBC with PKCS7 padding
 * 5. Convert to UTF-8 string
 *
 * @param value - Encrypted string (hex format)
 * @param enabled - Whether decryption is enabled
 * @returns Decrypted string or original value if disabled
 */
export function decrypt(value: string, enabled: boolean = false): string {
  if (!enabled) return value;

  try {
    logger.debug("[Crypto] Attempting decryption", {
      inputType: typeof value,
      inputLength: value?.length,
      inputPreview: value?.substring(0, 100)
    });
    
    // Convert base64 secret key to WordArray
    const keyWordArray = CryptoJS.enc.Base64.parse(env.secretKey);
    logger.debug("[Crypto] Key WordArray size", { size: keyWordArray.sigBytes });
    
    // Convert hex IV to WordArray
    const ivWordArray = CryptoJS.enc.Hex.parse(env.ivKey);
    logger.debug("[Crypto] IV WordArray size", { size: ivWordArray.sigBytes });
    
    // Convert hex ciphertext to WordArray
    const ciphertextWordArray = CryptoJS.enc.Hex.parse(value);
    logger.debug("[Crypto] Ciphertext WordArray size", { size: ciphertextWordArray.sigBytes });
    
    // Create CipherParams object for decryption
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertextWordArray,
    });

    // AES decryption using CBC mode with PKCS7 padding
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const result = decrypted.toString(CryptoJS.enc.Utf8);

    if (!result) {
      logger.error("[Crypto] Decryption produced empty result");
      throw new Error("Decryption produced empty result - likely wrong key or corrupted data");
    }
    
    logger.debug("[Crypto] Decryption successful", {
      resultLength: result.length,
      resultPreview: result.substring(0, 100)
    });
    return result;
  } catch (error) {
    logger.error("[Crypto] Decryption failed", { error });
    throw error;
  }
}
