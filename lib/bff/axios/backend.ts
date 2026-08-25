import axios from "axios";
import { HEADERS, DEFAULT_HEADER_VALUES } from "@lib/constants/headers";
import { logger } from "@lib/logger/logger";

const getBackendBaseUrl = (): string => {
  const url =
    process.env.BACKEND_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://api.superott.in";
  return url.replace(/\/$/, "");
};

export const backendClient = axios.create({
  baseURL: getBackendBaseUrl(),
  timeout: 10000,
  headers: {
    [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
    [HEADERS.ACCEPT]: HEADERS.JSON,
    [HEADERS.DEVICE_TYPE_CODE]: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
    [HEADERS.APP_VERSION]: DEFAULT_HEADER_VALUES.APP_VERSION,
    [HEADERS.PROJECT]: DEFAULT_HEADER_VALUES.PROJECT,
  },
});

// Request Interceptor: Logging & Metadata
backendClient.interceptors.request.use(
  (config) => {
    config.headers["x-bff-timestamp"] = String(Date.now());
    logger.info(`[BFF Backend Client] Sending ${config.method?.toUpperCase()} to ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    logger.error("[BFF Backend Client] Request configuration error", { error });
    return Promise.reject(error);
  }
);

// Response Interceptor: Logging
backendClient.interceptors.response.use(
  (response) => {
    logger.info(`[BFF Backend Client] Received ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    logger.error(`[BFF Backend Client] Error response from ${error.config?.url}`, {
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);
