import { env } from "@lib/config/env";
import { logger } from "@lib/logger/logger";
import { getAesCbcKey, hexToBytes, bytesToHex } from "./webCryptoKey";

/**
 * Encrypts a value using AES-CBC encryption via the native Web Crypto API.
 * See decrypt.ts for why this uses SubtleCrypto instead of CryptoJS.
 */
export async function encrypt(value: string, enabled: boolean = false): Promise<string> {
  if (!enabled) return value;

  try {
    logger.debug("[Crypto] Attempting encryption", { inputLength: value?.length });

    const key = await getAesCbcKey();
    const iv = hexToBytes(env.ivKey);
    const data = new TextEncoder().encode(value);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: iv as BufferSource },
      key,
      data as BufferSource
    );

    // Convert to hex string (matching server expectation)
    const hexOutput = bytesToHex(new Uint8Array(encryptedBuffer));

    logger.debug("[Crypto] Encryption successful", { outputLength: hexOutput.length });
    return hexOutput;
  } catch (error) {
    logger.error("[Crypto] Encryption failed", { error });
    throw new Error("Encryption failed");
  }
}
