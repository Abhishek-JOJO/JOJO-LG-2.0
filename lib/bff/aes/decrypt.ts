import crypto from "node:crypto";
import { logger } from "@lib/logger/logger";

function getSecretKey(): string {
  return process.env.BACKEND_SECRET_KEY || process.env.NEXT_PUBLIC_SECRET_KEY || "";
}

function getIvKey(): string {
  return process.env.BACKEND_SECRET_IV || process.env.NEXT_PUBLIC_SECRET_IV || "";
}

/**
 * Decrypts encrypted hex payloads received from backend inside BFF using native Node.js crypto.
 * Uses AES-256-CBC mode with PKCS7 padding.
 */
export function decryptBffPayload<T = unknown>(encryptedHex: string): T {
  if (!encryptedHex || typeof encryptedHex !== "string") {
    return encryptedHex as unknown as T;
  }

  try {
    const secretKey = getSecretKey();
    const ivKey = getIvKey();

    if (!secretKey || !ivKey) {
      logger.error("[BFF Crypto] Missing AES keys for decryption");
      throw new Error("Missing decryption keys");
    }

    const key = Buffer.from(secretKey, "base64");
    const iv = Buffer.from(ivKey, "hex");

    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    if (!decrypted) {
      logger.error("[BFF Crypto] Decryption produced empty result");
      throw new Error("Decryption produced empty result");
    }

    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as unknown as T;
    }
  } catch (error) {
    logger.error("[BFF Crypto] Native Node.js Decryption failed", { error });
    throw error;
  }
}
