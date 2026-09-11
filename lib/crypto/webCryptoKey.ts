import { env } from "@lib/config/env";

/**
 * Shared AES-CBC key material + hex helpers for encrypt.ts/decrypt.ts.
 *
 * Uses the native Web Crypto API (SubtleCrypto) instead of the CryptoJS
 * library it replaced. CryptoJS's AES implementation is pure JS and runs
 * entirely on the main thread — on a weak TV SoC, decrypting a single
 * content-rails response was measured (via CPU profiling) costing several
 * hundred ms of synchronous main-thread time, directly delaying the hero
 * carousel's first paint. SubtleCrypto's AES-CBC is implemented natively by
 * the browser (hardware-accelerated where available) and is asynchronous,
 * so it no longer blocks rendering while it runs.
 */

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// Imported once and reused for every request — importKey is cheap, but
// there's no reason to redo it per call.
let cachedKeyPromise: Promise<CryptoKey> | null = null;

export function getAesCbcKey(): Promise<CryptoKey> {
  if (!cachedKeyPromise) {
    cachedKeyPromise = crypto.subtle.importKey(
      "raw",
      base64ToBytes(env.secretKey) as BufferSource,
      { name: "AES-CBC" },
      false,
      ["encrypt", "decrypt"]
    );
  }
  return cachedKeyPromise;
}
