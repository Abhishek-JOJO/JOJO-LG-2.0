import crypto from "node:crypto";

/**
 * Extracts incoming x-request-id or generates a new unique correlation ID.
 */
export function getOrCreateCorrelationId(incomingHeader?: string | null): string {
  if (incomingHeader && typeof incomingHeader === "string" && incomingHeader.trim().length > 0) {
    return incomingHeader.trim();
  }
  return `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}
