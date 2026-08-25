import { cookies } from "next/headers";
import { logger } from "@lib/logger/logger";

export const AUTH_TOKEN_COOKIE = "jojo_auth_token";
export const DEVICE_ID_COOKIE = "jojo_device_id";
export const LOCALE_COOKIE = "jojo_locale";

/**
 * Sets the HttpOnly authentication token cookie upon login or OTP verification.
 */
export async function setAuthSessionCookie(token: string): Promise<void> {
  if (!token) return;

  try {
    const cookieStore = await cookies();
    cookieStore.set(AUTH_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });
    logger.info("[BFF Cookies] Auth session cookie set successfully");
  } catch (error) {
    logger.error("[BFF Cookies] Failed to set auth session cookie", { error });
  }
}

/**
 * Retrieves the current authentication token from HttpOnly cookie.
 */
export async function getAuthSessionToken(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

/**
 * Clears the authentication token cookie on logout or session expiry.
 */
export async function clearAuthSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_TOKEN_COOKIE);
    logger.info("[BFF Cookies] Auth session cookie cleared");
  } catch (error) {
    logger.error("[BFF Cookies] Failed to clear auth session cookie", { error });
  }
}
