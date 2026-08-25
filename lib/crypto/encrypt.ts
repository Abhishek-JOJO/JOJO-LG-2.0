import CryptoJS from "crypto-js";
import { env } from "@lib/config/env";
import { logger } from "@lib/logger/logger";

export function encrypt(value: string, enabled: boolean = false): string {
  if (!enabled) return value;

  try {
    logger.debug("[Crypto] Attempting encryption", { inputLength: value?.length });
    
    // Convert base64 secret key to WordArray
    const keyWordArray = CryptoJS.enc.Base64.parse(env.secretKey);
    
    // Convert hex IV to WordArray
    const ivWordArray = CryptoJS.enc.Hex.parse(env.ivKey);
    
    // AES encryption using CBC mode with PKCS7 padding
    const encrypted = CryptoJS.AES.encrypt(
      value,
      keyWordArray,
      {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    // Convert to hex string (matching server expectation)
    const hexOutput = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    
    logger.debug("[Crypto] Encryption successful", { outputLength: hexOutput.length });
    return hexOutput;
  } catch (error) {
    logger.error("[Crypto] Encryption failed", { error });
    throw new Error("Encryption failed");
  }
}
