import { env } from "@lib/config/env";
import { logger } from "@lib/logger/logger";
import { getAesCbcKey, hexToBytes } from "./webCryptoKey";

/**
 * Decrypts a value using AES-CBC decryption via the native Web Crypto API.
 * Used ONLY in API client for response decryption and config decryption.
 *
 * Flow:
 * 1. Secret Key: base64 → raw bytes → imported CryptoKey (cached)
 * 2. IV: hex → raw bytes
 * 3. Ciphertext: hex → raw bytes
 * 4. Decrypt using AES-CBC (PKCS#7 padding, SubtleCrypto's default)
 * 5. Convert result to UTF-8 string
 *
 * @param value - Encrypted string (hex format)
 * @param enabled - Whether decryption is enabled
 * @returns Decrypted string or original value if disabled
 */
export async function decrypt(value: string, enabled: boolean = false): Promise<string> {
  if (!enabled) return value;

  try {
    logger.debug("[Crypto] Attempting decryption", {
      inputType: typeof value,
      inputLength: value?.length,
      inputPreview: value?.substring(0, 100)
    });

    const key = await getAesCbcKey();
    const iv = hexToBytes(env.ivKey);
    const ciphertext = hexToBytes(value);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );

    const result = new TextDecoder("utf-8").decode(decryptedBuffer);

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
