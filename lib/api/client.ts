import { HttpMethod, HttpStatus } from "@enums/http.enum";
import { HEADERS, DEFAULT_HEADER_VALUES } from "@lib/constants/headers";
import { encrypt } from "@lib/crypto/encrypt";
import { decrypt } from "@lib/crypto/decrypt";
import { AppError } from "@lib/error/types";
import { logger } from "@lib/logger/logger";
import { appConfig, fetchConfig, getAppConfig, isConfigLoaded } from "../config/app.config";
import { getBrowserUID } from "@lib/utils/deviceId";
import { getPlatform } from "@lib/utils/platform";
import { useLocaleStore } from "@store/useLocaleStore";
import { useSessionExpiredStore } from "@store/useSessionExpiredStore";
import { useAuthStore } from "@store/useAuthStore";

interface RequestOptions {
  headers?: Record<string, string>;
  encrypt?: boolean;
  params?: Record<string, string | number | boolean>;
  signal?: AbortSignal;
  baseUrl?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

function getRetryDelay(attempt: number): number {
  const delays = appConfig.RETRY_DELAYS;
  const index = Math.min(attempt, delays.length - 1);
  return delays[index] ?? 600;
}

function buildQuery(params?: Record<string, any>): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

async function request<T>(
  method: HttpMethod,
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  // Check internet connection (browser only)
  if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.onLine === false) {
    logger.error("[API] No internet connection");
    throw new AppError("No internet connection", HttpStatus.SERVICE_UNAVAILABLE);
  }

  const isFullUrl = endpoint.startsWith("http://") || endpoint.startsWith("https://");

  // Config guard - prevent API calls before config is loaded
  if (!isFullUrl && !options?.baseUrl) {
    if (!isConfigLoaded()) {
      if (typeof window === "undefined") {
        await fetchConfig();
      } else {
        logger.error("[API] Config not loaded yet");
        throw new AppError("App is initializing. Please wait.", HttpStatus.SERVICE_UNAVAILABLE);
      }
    }
  }

  const config = getAppConfig();

  // Normalize URL to prevent double slashes
  const query = buildQuery(options?.params);

  let url: string;
  if (isFullUrl) {
      url = endpoint;
      if (query) {
        url += endpoint.includes("?") ? `&${query.slice(1)}` : query;
      }
    } else {
      const base = (options?.baseUrl || config.apiBaseUrl).replace(/\/$/, "");
      const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      
      // For static export (webOS TV), we cannot use Next.js /api routes.
      // We must hit the backend API directly from the client.
      url = `${base}${path}${query}`;
    }

  let lastError: unknown;

  for (let attempt = 0; attempt <= appConfig.MAX_RETRIES; attempt++) {
    // Check if aborted BEFORE attempt
    if (options?.signal?.aborted) {
      logger.info('[API] Request aborted before attempt', { endpoint, attempt });
      throw new AppError("Request cancelled", HttpStatus.SERVICE_UNAVAILABLE);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), appConfig.TIMEOUT_MS);

    try {
      const isFormData = body instanceof FormData;

      // Build headers based on URL type
      const headers: Record<string, string> = {};

      if (isFullUrl) {
        // For external URLs, ONLY use options.headers
        Object.assign(headers, options?.headers || {});
      } else {
        // For internal APIs, add all standard headers
        if (!isFormData) {
          headers[HEADERS.CONTENT_TYPE] = HEADERS.JSON;
        }
        headers[HEADERS.ACCEPT] = HEADERS.JSON;
        headers[HEADERS.DEVICE_TYPE_CODE] = DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE;

        if (typeof window === "undefined") {
          let serverToken = "";
          let serverLocale = "en";
          let serverDeviceId = "server-ssr-session";
          let forwardedFor = "";
          let realIp = "";
          try {
            const { cookies, headers: nextHeaders } = await import("next/headers");
            const cookieStore = await cookies();
            const headerStore = await nextHeaders();
            serverToken = cookieStore.get("jojo_auth_token")?.value || "";
            serverLocale = cookieStore.get("jojo_locale")?.value || "en";
            serverDeviceId = cookieStore.get("jojo_device_id")?.value || "server-ssr-session";
            forwardedFor = headerStore.get("x-forwarded-for") || "";
            realIp = headerStore.get("x-real-ip") || (forwardedFor ? forwardedFor.split(",")[0].trim() : "");
          } catch {
            // Outside server request context
          }

          headers[HEADERS.DEVICE_ID] = serverDeviceId;
          headers[HEADERS.LANGUAGE] = serverLocale === "gu" ? "2" : "1";
          if (serverToken && !options?.headers?.sessionid) {
            headers["sessionid"] = serverToken;
          }
          if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;
          if (realIp) headers["x-real-ip"] = realIp;
        } else {
          headers[HEADERS.DEVICE_ID] = getBrowserUID();
          const currentLocale = useLocaleStore.getState().locale;
          headers[HEADERS.LANGUAGE] = currentLocale === "gu" ? "2" : "1";
          const clientToken = useAuthStore.getState().token;
          if (clientToken && !options?.headers?.sessionid) {
            headers["sessionid"] = clientToken;
          }
        }

        headers[HEADERS.APP_VERSION] = DEFAULT_HEADER_VALUES.APP_VERSION;
        headers[HEADERS.PROJECT] = DEFAULT_HEADER_VALUES.PROJECT;
        headers["platform"] = getPlatform(); // Add OS platform

        // Merge with options.headers (sessionid, etc.)
        Object.assign(headers, options?.headers || {});
      }

      // Encrypt request body if needed (BFF handles browser encryption server-side)
      let requestBody = body;
      if (body && !isFormData && options?.encrypt) {
        requestBody = { data: encrypt(JSON.stringify(body), appConfig.flags.enableEncryption) };
        logger.info(`[API] Encrypted request body for ${endpoint}`);
      }

      const isGetOrHead = method === HttpMethod.GET || (method as string) === "HEAD";

      const response = await fetch(url, {
        method,
        headers,
        body: isGetOrHead
          ? undefined
          : isFormData
            ? (requestBody as FormData)
            : requestBody
              ? JSON.stringify(requestBody)
              : undefined,
        signal: options?.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      // Safe JSON parsing with fallback
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (textError) {
        logger.error(`[API] Error reading response text for ${method} ${endpoint}`, {
          error: textError instanceof Error ? textError.message : 'Unknown'
        });
      }

      let data: any = null;
      if (responseText && responseText.trim().length > 0) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          // Only log JSON parse errors for successful HTTP responses
          if (response.ok) {
            logger.error(`[API] JSON parse error for ${method} ${endpoint}`, {
              error: parseError instanceof Error ? parseError.message : 'Unknown',
              status: response.status,
              textPreview: responseText.substring(0, 200)
            });
          }
          data = null;
        }
      }

      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const retryDelay = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : getRetryDelay(attempt);

        logger.warn(`[API Rate Limit] ${method} ${endpoint}`, {
          retryAfter: retryAfter ?? "not specified",
          retryDelay,
        });

        if (attempt < appConfig.MAX_RETRIES) {
          await delay(retryDelay);
          continue;
        }

        throw new AppError("Too many requests. Please try again later.", 429 as HttpStatus);
      }

      // Handle error responses
      if (!response.ok) {
        const message = data?.message ?? response.statusText;
        lastError = new AppError(message, response.status as HttpStatus);

        // ── 401 Unauthorized: session expired or token invalidated ──────────
        if (response.status === HttpStatus.UNAUTHORIZED) {
          const isGuestLoginEndpoint = endpoint.includes('guest') || endpoint.includes('/auth/guest');
          if (!isGuestLoginEndpoint && typeof window !== "undefined") {
            const { user, clearAuth } = useAuthStore.getState();
            if (user?.isGuest) {
              logger.warn(`[API] Guest token returned 401. Automatically clearing and reloading page to recover session...`, { endpoint });
              clearAuth();
              window.location.reload();
            } else {
              logger.warn(`[API] 401 Unauthorized — triggering session expired modal`, { endpoint });
              useSessionExpiredStore.getState().showSessionExpired();
            }
          }
        }

        // Only retry for 5xx errors (server errors)
        const isRetryable = response.status >= 500 && response.status < 600;

        if (isRetryable && attempt < appConfig.MAX_RETRIES) {
          logger.warn(`[API Retry] ${method} ${endpoint} (attempt ${attempt + 1})`, {
            status: response.status,
            message,
            nextRetry: attempt + 1,
          });
          await delay(getRetryDelay(attempt));
          continue;
        }

        // Do NOT retry for 4xx errors (client errors)
        const isExpectedNotFound = response.status === 404 && endpoint.includes("check-user");
        if (!isExpectedNotFound) {
          logger.error(`[API Error] ${method} ${endpoint}`, { status: response.status, message });
        }
        throw lastError;
      }

      // Normalize meta-data → metaData
      let normalizedData = data;
      if (data && typeof data === 'object' && 'meta-data' in data) {
        normalizedData = {
          metaData: data['meta-data'],
          data: data.data
        };
      }

      // ── Business 401/403 Unauthorized check inside HTTP 200 ──────────
      const getBusinessStatus = (obj: any): number | null => {
        if (!obj || typeof obj !== 'object') return null;
        const meta = obj.metaData || obj['meta-data'] || obj.metadata;
        if (meta && typeof meta === 'object') {
          const status = meta.status ?? meta.statusCode ?? meta.code;
          if (status !== undefined) return Number(status);
        }
        return null;
      };

      const businessStatus = getBusinessStatus(normalizedData);
      if (businessStatus === 401) {
        const isGuestLoginEndpoint = endpoint.includes('guest') || endpoint.includes('/auth/guest');
        if (!isGuestLoginEndpoint && typeof window !== "undefined") {
          const { user, clearAuth } = useAuthStore.getState();
          if (user?.isGuest) {
            logger.warn(`[API] Guest token returned business 401. Automatically clearing and reloading page to recover session...`, { endpoint, businessStatus });
            clearAuth();
            window.location.reload();
          } else {
            logger.warn(`[API] Business 401 Unauthorized — triggering session expired modal`, { endpoint, businessStatus });
            useSessionExpiredStore.getState().showSessionExpired();
          }
        }
        throw new AppError(normalizedData?.metaData?.message || "Session expired", 401);
      } else if (businessStatus === 403) {
        logger.warn(`[API] Business 403 Forbidden returned`, { endpoint, message: normalizedData?.metaData?.message });
        throw new AppError(normalizedData?.metaData?.message || "Access forbidden", 403);
      }

      // Safe decryption with validation
      if (normalizedData && typeof normalizedData === 'object' && 'data' in normalizedData) {
        // Only attempt decryption if data is a string
        if (typeof normalizedData.data === 'string' && normalizedData.data.length > 0) {
          try {
            const decrypted = decrypt(normalizedData.data, appConfig.flags.enableEncryption);

            // Validate decrypted data is valid JSON
            if (!decrypted || decrypted.trim().length === 0) {
              logger.warn('[API] Decrypted data is empty', { endpoint });
              logger.info(`[API] ${method} ${endpoint}`, { status: response.status, attempt: attempt + 1 });
              return normalizedData as T;
            }

            const parsed = JSON.parse(decrypted);

            // Check if parsed data has its own data/meta-data structure
            if (parsed && typeof parsed === 'object' && 'data' in parsed) {
              // Decrypted response has its own structure, use it directly
              logger.info(`[API] ${method} ${endpoint}`, { status: response.status, attempt: attempt + 1 });
              return {
                metaData: parsed['meta-data'] || parsed.metaData,
                data: parsed.data
              } as T;
            }

            // Otherwise, wrap parsed data
            logger.info(`[API] ${method} ${endpoint}`, { status: response.status, attempt: attempt + 1 });
            return {
              metaData: normalizedData.metaData,
              data: parsed
            } as T;
          } catch (error) {
            logger.error('[API] Decryption/parsing failed', {
              error: error instanceof Error ? error.message : 'Unknown',
              endpoint,
              dataType: typeof normalizedData.data,
              dataPreview: typeof normalizedData.data === 'string' ? normalizedData.data.substring(0, 100) : 'not a string'
            });
            // If decryption fails, return normalized response as-is
            logger.info(`[API] ${method} ${endpoint}`, { status: response.status, attempt: attempt + 1 });
            return normalizedData as T;
          }
        }
        // If data is already an object, return as-is
        else if (typeof normalizedData.data === 'object') {
          logger.info(`[API] ${method} ${endpoint} (data already object)`, { status: response.status, attempt: attempt + 1 });
          return normalizedData as T;
        }
      }

      // Return normalized response
      logger.info(`[API] ${method} ${endpoint}`, { status: response.status, attempt: attempt + 1 });
      return normalizedData as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof AppError) throw error;

      // Check if aborted INSIDE catch
      if (options?.signal?.aborted || isAbortError(error)) {
        logger.info('[API] Request aborted', { endpoint, attempt });
        throw new AppError("Request cancelled", HttpStatus.SERVICE_UNAVAILABLE);
      }

      // Handle timeout errors
      if (isTimeoutError(error)) {
        logger.warn(`[API Timeout] ${method} ${endpoint} (attempt ${attempt + 1})`, {
          timeout: appConfig.TIMEOUT_MS,
        });
        lastError = new AppError("Request timeout", HttpStatus.SERVICE_UNAVAILABLE);

        // Retry for timeout
        if (attempt < appConfig.MAX_RETRIES) {
          await delay(getRetryDelay(attempt));
          continue;
        }
        throw lastError;
      }

      // Handle network errors
      if (isNetworkError(error)) {
        logger.warn(`[API Network Error] ${method} ${endpoint} (attempt ${attempt + 1})`, {
          error: (error as Error).message,
        });
        lastError = new AppError(
          "Network error. Please check your connection.",
          HttpStatus.SERVICE_UNAVAILABLE
        );

        // Retry for network error
        if (attempt < appConfig.MAX_RETRIES) {
          await delay(getRetryDelay(attempt));
          continue;
        }
        throw lastError;
      }

      // Other errors - do not retry
      logger.error(`[API Unknown Error] ${method} ${endpoint}`, {
        error: error instanceof Error ? error.message : "Unknown",
      });
      lastError = new AppError("An unexpected error occurred", HttpStatus.INTERNAL_SERVER_ERROR);
      throw lastError;
    }
  }

  throw lastError ?? new AppError("Unknown error", HttpStatus.INTERNAL_SERVER_ERROR);
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) => request<T>(HttpMethod.GET, endpoint, undefined, options),
  post: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(HttpMethod.POST, endpoint, body, options),
  put: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(HttpMethod.PUT, endpoint, body, options),
  patch: <T>(endpoint: string, body: unknown, options?: RequestOptions) =>
    request<T>(HttpMethod.PATCH, endpoint, body, options),
  delete: <T>(endpoint: string, options?: RequestOptions) => request<T>(HttpMethod.DELETE, endpoint, undefined, options),
};