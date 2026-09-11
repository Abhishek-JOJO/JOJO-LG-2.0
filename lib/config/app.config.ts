import { HttpStatus } from "@/enums/http.enum";
import { StorageKey } from "@/enums/storage.enum";
import { DEFAULT_HEADER_VALUES, HEADERS } from "@lib/constants/headers";
import { decrypt } from "@lib/crypto/decrypt";
import { logger } from "@lib/logger/logger";
import { env } from "./env";

export const HTTP_STATUS_PAGES: Record<HttpStatus, string> = {
    [HttpStatus.OK]: "/",
    [HttpStatus.CREATED]: "/created",
    [HttpStatus.NO_CONTENT]: "/no-content",
    [HttpStatus.BAD_REQUEST]: "/bad-request",
    [HttpStatus.UNAUTHORIZED]: "/unauthorized",
    [HttpStatus.FORBIDDEN]: "/forbidden",
    [HttpStatus.NOT_FOUND]: "/not-found",
    [HttpStatus.CONFLICT]: "/conflict",
    [HttpStatus.UNPROCESSABLE]: "/unprocessable",
    [HttpStatus.TOO_MANY_REQUESTS]: "/too-many-requests",
    [HttpStatus.INTERNAL_SERVER_ERROR]: "/server-error",
    [HttpStatus.BAD_GATEWAY]: "/bad-gateway",
    [HttpStatus.SERVICE_UNAVAILABLE]: "/unavailable",
};

export interface ApiUpdate {
    name: string;
    timestamp: string;
}

export interface RuntimeConfig {
    apiBaseUrl: string;
    socketUrl: string;
    envType: "stage" | "prod";
    publicIp?: string;
    apiUpdates?: ApiUpdate[];
    analyticUrl: string;
}

// In-memory config storage
let runtimeConfig: RuntimeConfig | null = null;

// Fetch in progress flag to prevent duplicate requests
let fetchInProgress: Promise<RuntimeConfig> | null = null;

/**
 * Fetches runtime config from API
 * Config response is encrypted and must be decrypted
 * Retries once on failure
 * Falls back to env variables if fetch fails
 * 
 * Uses in-memory cache to prevent duplicate fetches
 */
export async function fetchConfig(): Promise<RuntimeConfig> {
    // Return cached config if already loaded
    if (runtimeConfig) {
        logger.info("[Config] Using cached config");
        return runtimeConfig;
    }

    // Return in-progress fetch to prevent duplicate requests
    if (fetchInProgress) {
        logger.info("[Config] Fetch already in progress, waiting...");
        return fetchInProgress;
    }

    // Start new fetch
    fetchInProgress = (async () => {
        try {
            const config = await performFetch();
            runtimeConfig = config;
            return config;
        } finally {
            fetchInProgress = null;
        }
    })();

    return fetchInProgress;
}

function formatSocketUrl(url: string | undefined | null): string {
    if (!url) return "";
    const trimmed = url.trim();
    if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
        return trimmed;
    }
    return trimmed.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

async function performFetch(): Promise<RuntimeConfig> {
    // Skip config fetch in development mode
    if (env.skipConfig) {
        logger.info("[Config] Skipping config fetch (development mode)");
        return {
            apiBaseUrl: env.fallbackApiBaseUrl,
            socketUrl: formatSocketUrl(env.fallbackSocketUrl),
            envType: env.fallbackEnvType,
            analyticUrl: "",
        };
    }

    const maxRetries = 1;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
        try {
            logger.info(`[Config] Fetching config (attempt ${attempt + 1}/${maxRetries + 1})`);
            logger.info(`[Config] Request URL: ${env.configUrl}`);
            logger.info(`[Config] Request method: POST`);

            const response = await fetch(env.configUrl, {
                method: "POST",
                headers: {
                    [HEADERS.CONTENT_TYPE]: HEADERS.JSON,
                    // Add custom headers like other API calls
                    [HEADERS.DEVICE_TYPE_CODE]: DEFAULT_HEADER_VALUES.DEVICE_TYPE_CODE,
                    [HEADERS.DEVICE_ID]: typeof window !== 'undefined' && typeof localStorage !== 'undefined' ? (localStorage.getItem('browser_uid') || '') : '',
                    [HEADERS.LANGUAGE]: (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && localStorage.getItem(StorageKey.LOCALE) === 'gu') ? '2' : '1',
                    [HEADERS.APP_VERSION]: DEFAULT_HEADER_VALUES.APP_VERSION,
                    [HEADERS.PROJECT]: DEFAULT_HEADER_VALUES.PROJECT,
                },
                body: JSON.stringify({}), // Empty body as per your old flow
            });

            logger.info(`[Config] Response status: ${response.status}`);
            logger.info(`[Config] Response headers:`, Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                throw new Error(`Config fetch failed: ${response.status}`);
            }

            const data = await response.json();

            // Log the full API response for debugging
            logger.info("[Config] Full API Response:", data);
            logger.info("[Config] Response keys:", Object.keys(data));
            logger.info("[Config] Response type:", typeof data);

            logger.info("[Config] Response received, attempting decryption");

            // Try to decrypt config response
            try {
                // Extract encrypted data - check multiple possible locations
                const encryptedData = data.data || data.encrypted || data;

                logger.info("[Config] Encrypted data location:", data.data ? 'data.data' : data.encrypted ? 'data.encrypted' : 'data');
                logger.info("[Config] Encrypted data type:", typeof encryptedData);
                logger.info("[Config] Encrypted data preview:", typeof encryptedData === 'string' ? encryptedData.substring(0, 100) + '...' : encryptedData);

                const decrypted = await decryptConfig(encryptedData);
                logger.info("[Config] Decryption successful, decrypted config:", decrypted);
                return decrypted;
            } catch (decryptError) {
                logger.warn("[Config] Decryption failed, trying plain JSON");
                logger.error("[Config] Decryption error details:", decryptError);

                // If decryption fails, try parsing as plain JSON
                if (typeof data === "object" && data.apiBaseUrl) {
                    logger.info("[Config] Using plain JSON response");
                    return data as RuntimeConfig;
                }
                throw decryptError;
            }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error("Unknown error");
            logger.error(`[Config] Attempt ${attempt + 1} failed`, { error: lastError.message });

            attempt++;
            if (attempt <= maxRetries) {
                // Wait before retry
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
    }

    // If all attempts failed, use fallback config
    if (env.fallbackApiBaseUrl) {
        logger.warn("[Config] Using fallback config from environment variables");
        return {
            apiBaseUrl: env.fallbackApiBaseUrl,
            socketUrl: formatSocketUrl(env.fallbackSocketUrl),
            envType: env.fallbackEnvType,
            analyticUrl: "",
        };
    }

    throw new Error(
        `Failed to fetch config after ${maxRetries + 1} attempts: ${lastError?.message || "Unknown error"}`
    );
}

/**
 * Decrypts config response using AES with keys from env
 */
async function decryptConfig(encrypted: string): Promise<RuntimeConfig> {
    try {
        const decrypted = await decrypt(encrypted, true);
        const parsed = JSON.parse(decrypted);

        logger.info("[Config] Decryption successful, decrypted config:", parsed);

        // Extract data from the response structure
        const data = parsed.data || parsed;
        const api = data.api || {};

        logger.info("[Config] Extracted API config:", api);

        // Determine environment type from env or default to stage
        const envType: "stage" | "prod" = env.fallbackEnvType;

        logger.info("[Config] Environment type:", envType);
        logger.info("[Config] Stage URL:", api.stageBaseUrl);
        logger.info("[Config] Prod URL:", api.prodBaseUrl);

        // Extract apiUpdate array if present
        const apiUpdates = data.apiUpdate || [];
        logger.info("[Config] API Updates:", apiUpdates);

        // Map to RuntimeConfig structure
        const config: RuntimeConfig = {
            apiBaseUrl: envType === "prod" ? api.prodBaseUrl : api.stageBaseUrl,
            socketUrl: formatSocketUrl(envType === "prod" ? api.socketProdUrl : api.socketBaseUrl),
            envType: envType,
            publicIp: data.publicIp,
            apiUpdates: apiUpdates,
            analyticUrl: envType === "prod" ? (api.analyticProdUrl || "") : (api.analyticStageUrl || ""),
        };

        logger.info("[Config] Mapped config", {
            envType,
            apiBaseUrl: config.apiBaseUrl,
            socketUrl: config.socketUrl,
            publicIp: config.publicIp,
            apiUpdatesCount: apiUpdates.length
        });

        return config;
    } catch (error) {
        logger.error("[Config] Failed to decrypt/parse config", { error });
        throw new Error("Failed to decrypt config");
    }
}

/**
 * Sets runtime config in memory
 * Called by bootstrap provider after fetching
 */
export function setAppConfig(config: RuntimeConfig): void {
    runtimeConfig = config;
}

/**
 * Gets runtime config from memory
 * Throws if config not loaded (should never happen after bootstrap)
 */
export function getAppConfig(): RuntimeConfig {
    if (!runtimeConfig) {
        throw new Error("Config not loaded. Ensure BootstrapProvider has initialized.");
    }
    return runtimeConfig;
}

/**
 * Checks if config is loaded
 */
export function isConfigLoaded(): boolean {
    return runtimeConfig !== null;
}

/**
 * Gets API update timestamp for a specific resource
 * Returns null if not found
 */
export function getApiUpdateTimestamp(resourceName: string): string | null {
    if (!runtimeConfig?.apiUpdates) {
        return null;
    }

    const update = runtimeConfig.apiUpdates.find(u => u.name === resourceName);
    return update?.timestamp || null;
}

/**
 * Static app configuration (non-runtime)
 * These values don't change based on environment
 */
export const appConfig = {
    flags: {
        enableEncryption: true,  // Enable encryption for API responses
        enableLogger: true,
        enableMocks: false,
        enableAnalytics: true,
        enableCaptcha: false,     // Enable/disable reCAPTCHA verification globally
        showNavbar: true,
        showFooter: false,
        showDarkLightToggle: true,
        showLanguageDropdown: true,
        isShowLanguageDropdown: false,
        isShowAutoProgressBarHeroBanner: false,
        isEnableHomeCarouselLike: false,
        /**
         * Mobile access flags:
         * - MOBILE_RESPONSIVE_WITH_AUTH: allow auth/profile onboarding routes on mobile.
         * - MOBILE_RESPONSIVE_WITHOUT_AUTH: when false, block normal website access on mobile.
         */
        MOBILE_RESPONSIVE_WITH_AUTH: true,
        MOBILE_RESPONSIVE_WITHOUT_AUTH: true,
        enableExampleRoute: false,
        enableEventsRoute: false,
    },
    BreakPoint: {
        SM: "(max-width: 640px)",
        MD: "(max-width: 768px)",
        LG: "(max-width: 1024px)",
        XL: "(max-width: 1280px)",
        XXL: "(max-width: 1536px)",
    },
    TIMEOUT_MS: 10000,
    MAX_RETRIES: 2,
    RETRY_DELAYS: [300, 600],
    LIMITS: {
        PAGE_SIZE: 20,
        REQUEST_TIMEOUT_MS: 10_000,
        TOKEN_EXPIRY_BUFFER_S: 60,
        TOAST_DURATION_MS: 4_000,
        DEBOUNCE_SEARCH_MS: 300,
    },
    COOKIE_SET_TIME_LIMIT: 24 * 60 * 60 * 1000,
    COOKIE_EXPIRY_DAYS: 7,
    MOBILE_NUMBER_START_WITH: "+",
    OTP_LENGTH: 4,
    RESEND_SECONDS: 15,
    DEFAULT_COUNTRY_NAME: "IN",
    FACEBOOK_SDK_URL: 'https://connect.facebook.net/en_US/sdk.js',
    FACEBOOK_TIMEOUT_MS: 60000, // 60 seconds,
    LINK_START_WITH: 'http',
    MOBILE_QUERY: "(max-width: 767px)",
    GEO_DEFAULT_COUNTRY_CODE: "IN",
    GEO_DEFAULT_COUNTRY_NAME: "India",
    GEO_DEFAULT_TIMEZONE: "Asia/Kolkata",
    GEO_DEFAULT_CITY: "",
    GEO_DEFAULT_REGION: "",
    GEO_DEFAULT_LONGITUDE: 0,
    GEO_DEFAULT_LATITUDE: 0,
    ENGLISH_LANGUAGE_CODE: 'en',
    GUJRATI_LANGUAGE_CODE: 'gu',
    AUTOSCROLL_TIME: 6000,
    USE_APP_NAVIGATION_STALETIME: 10 * 60 * 1000,
    USE_APP_NAVIGATION_RETRY: 2,
    STALE_TIME: 5 * 60 * 1000,
    CUSTOME_PLATFORM_EVENT_NAME: "Web_2.0"
}