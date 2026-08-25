import crypto from "node:crypto";
import { logger } from "@lib/logger/logger";

function getSecretKey(): string {
  return process.env.BACKEND_SECRET_KEY || process.env.NEXT_PUBLIC_SECRET_KEY || "";
}

function getIvKey(): string {
  return process.env.BACKEND_SECRET_IV || process.env.NEXT_PUBLIC_SECRET_IV || "";
}

/**
 * Encrypts data for backend communication inside BFF using native Node.js crypto.
 * Uses AES-256-CBC mode with PKCS7 padding matching Node backend expectations.
 * High throughput, zero client bundle overhead, ~10x faster than crypto-js.
 */
export function encryptBffPayload(data: unknown): string {
  if (data === undefined || data === null) return "";

  const value = typeof data === "string" ? data : JSON.stringify(data);

  try {
    const secretKey = getSecretKey();
    const ivKey = getIvKey();

    if (!secretKey || !ivKey) {
      logger.error("[BFF Crypto] Missing AES keys for encryption");
      throw new Error("Missing encryption keys");
    }

    const key = Buffer.from(secretKey, "base64");
    const iv = Buffer.from(ivKey, "hex");

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");

    return encrypted;
  } catch (error) {
    logger.error("[BFF Crypto] Native Node.js Encryption failed", { error });
    throw new Error("BFF Encryption failed");
  }
}
