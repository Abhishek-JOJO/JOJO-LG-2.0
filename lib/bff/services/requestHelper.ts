import { backendClient } from "../backend-client";
import { encryptBffPayload } from "../aes/encrypt";
import { decryptBffPayload } from "../aes/decrypt";
import { bffStructuredLogger } from "../logger";
import { getOrCreateCorrelationId } from "../correlation";
import { bffCache } from "../cache";
import { HEADERS, DEFAULT_HEADER_VALUES } from "@lib/constants/headers";
import { AxiosRequestConfig } from "axios";

export interface BffRequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  sessionId?: string;
  shouldEncrypt?: boolean;
  cacheTtlMs?: number;
  correlationId?: string;
}

export interface BffResponse<T = any> {
  status: number;
  data: T;
}

export function getClientIp(req: any): string | undefined {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || (req as any).ip || undefined;
}

export function extractBffHeaders(req: any) {
  const deviceId = req.headers.get("deviceid") || req.headers.get("device_id") || "server-bff-session";
  const language = req.headers.get("language") || "1";
  const platform = req.headers.get("platform") || "Web";
  // Fallback to process.env.NEXT_PUBLIC_APP_VERSION if not provided in headers
  const appVersion = req.headers.get("appversion") || process.env.NEXT_PUBLIC_APP_VERSION || "2.0.0";
  // Safe IP extraction
  const ip = getClientIp(req) || deviceId;

  return { deviceId, language, platform, appVersion, ip };
}

/**
 * Universal Production-Grade Server Helper that executes requests against the Node backend.
 * Integrates:
 * - Native node:crypto AES encryption / decryption
 * - Keep-Alive connection pooling via backendClient
 * - Correlation ID tracing (x-request-id)
 * - In-memory SWR caching for static GET routes
 * - Structured JSON logging & payload sanitization
 */
export async function executeBackendRequest<T = any>({
  method,
  endpoint,
  body,
  headers = {},
  params,
  sessionId,
  shouldEncrypt = true,
  cacheTtlMs = 0,
  correlationId,
}: BffRequestOptions): Promise<BffResponse<T>> {
  const startTime = Date.now();
  const reqId = getOrCreateCorrelationId(correlationId || headers["x-request-id"]);

  const isGetOrHead = method === "GET" || (method as string) === "HEAD";
  const cacheKey = isGetOrHead ? `bff_cache:${endpoint}:${JSON.stringify(params || {})}` : "";

  // Check cache for GET requests
  if (isGetOrHead && cacheTtlMs > 0) {
    const cachedData = bffCache.get<T>(cacheKey);
    if (cachedData) {
      bffStructuredLogger.info("BFF Cache Hit", {
        correlationId: reqId,
        endpoint,
        duration: Date.now() - startTime,
      });
      return { status: 200, data: cachedData };
    }
  }

  const requestHeaders: Record<string, string> = {
    [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
    [HEADERS.ACCEPT]: HEADERS.JSON,
    [HEADERS.DEVICE_TYPE_CODE]: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
    [HEADERS.APP_VERSION]: DEFAULT_HEADER_VALUES.APP_VERSION,
    [HEADERS.PROJECT]: DEFAULT_HEADER_VALUES.PROJECT,
    [HEADERS.DEVICE_ID]: headers["deviceID"] || headers["device_id"] || "server-bff-session",
    "device_id": headers["deviceID"] || headers["device_id"] || "server-bff-session",
    [HEADERS.LANGUAGE]: headers["language"] || "1",
    "platform": headers["platform"] || "Web",
    "x-request-id": reqId,
    ...headers,
  };

  if (sessionId) {
    requestHeaders["sessionid"] = sessionId;
  }

  let payload = isGetOrHead ? undefined : body;

  if (!isGetOrHead && body && shouldEncrypt && typeof body === "object") {
    try {
      const encryptedHex = encryptBffPayload(body);
      payload = { data: encryptedHex };
    } catch (encryptError) {
      bffStructuredLogger.error("Request Encryption Failed", {
        correlationId: reqId,
        endpoint,
        error: encryptError,
      });
      return {
        status: 500,
        data: { metaData: { status: 500, message: "Request encryption failed" }, data: null } as unknown as T,
      };
    }
  }

  try {
    const axiosConfig: AxiosRequestConfig = {
      method,
      url: endpoint,
      data: isGetOrHead ? undefined : payload,
      params,
      headers: requestHeaders,
    };

    bffStructuredLogger.info("Sending BFF Request to Backend", {
      correlationId: reqId,
      method,
      endpoint,
      params,
    });

    const response = await backendClient.request(axiosConfig);
    let responseData = response.data;

    // Normalize meta-data → metaData if present
    if (responseData && typeof responseData === "object" && "meta-data" in responseData) {
      responseData = {
        metaData: responseData["meta-data"],
        data: responseData.data,
      };
    }

    // Decrypt encrypted backend response if present
    if (responseData && typeof responseData === "object" && "data" in responseData) {
      const rawEncrypted = responseData.data;
      if (typeof rawEncrypted === "string" && rawEncrypted.length > 0) {
        try {
          const decrypted = decryptBffPayload(rawEncrypted);

          if (decrypted && typeof decrypted === "object" && "data" in decrypted) {
            responseData = decrypted;
          } else {
            responseData = {
              metaData: responseData.metaData || { status: 200, message: "Success" },
              data: decrypted,
            };
          }
        } catch (decryptError) {
          bffStructuredLogger.warn("Response Decryption Fallback", {
            correlationId: reqId,
            endpoint,
            error: decryptError,
          });
        }
      }
    }

    const duration = Date.now() - startTime;
    bffStructuredLogger.info("Received Backend Response", {
      correlationId: reqId,
      method,
      endpoint,
      status: response.status,
      durationMs: duration,
    });

    // Populate cache if cacheTtlMs > 0
    if (isGetOrHead && cacheTtlMs > 0 && responseData) {
      bffCache.set(cacheKey, responseData, cacheTtlMs);
    }

    return {
      status: response.status,
      data: responseData,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorStatus = error.response?.status || 500;
    const errorMessage = error.response?.data?.metaData?.message || error.message || "Backend request failed";

    const isExpectedNotFound = errorStatus === 404 && endpoint.includes("check-user");
    if (!isExpectedNotFound) {
      bffStructuredLogger.error("Backend Request Error", {
        correlationId: reqId,
        method,
        endpoint,
        status: errorStatus,
        message: errorMessage,
        durationMs: duration,
      });
    }

    return {
      status: errorStatus,
      data: {
        metaData: {
          status: errorStatus,
          message: errorMessage,
        },
        data: null,
      } as unknown as T,
    };
  }
}
