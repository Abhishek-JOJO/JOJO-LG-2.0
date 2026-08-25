import axios from "axios";
import http from "node:http";
import https from "node:https";
import { HEADERS, DEFAULT_HEADER_VALUES } from "@lib/constants/headers";
import { logger } from "@lib/logger/logger";

const getBackendBaseUrl = (): string => {
  const url =
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://api.superott.in";
  return url.replace(/\/$/, "");
};

/**
 * Shared Backend Axios Client for Next.js BFF.
 * Configured with HTTP & HTTPS Keep-Alive pooling (max 100 sockets)
 * to reuse open TCP connections and eliminate TLS handshake latency.
 */
export const backendClient = axios.create({
  baseURL: getBackendBaseUrl(),
  timeout: 10000,
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 100 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 100, rejectUnauthorized: process.env.NODE_ENV === "production" }),
  headers: {
    [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
    [HEADERS.ACCEPT]: HEADERS.JSON,
    [HEADERS.DEVICE_TYPE_CODE]: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
    [HEADERS.APP_VERSION]: DEFAULT_HEADER_VALUES.APP_VERSION,
    [HEADERS.PROJECT]: DEFAULT_HEADER_VALUES.PROJECT,
  },
});

// Request Interceptor: Add timestamp
backendClient.interceptors.request.use(
  (config) => {
    config.headers["x-bff-timestamp"] = String(Date.now());
    return config;
  },
  (error) => {
    logger.error("[BFF Backend Client] Request configuration error", { error });
    return Promise.reject(error);
  }
);
