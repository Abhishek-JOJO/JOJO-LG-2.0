import { apiClient } from "./client";
import { ApiEndpoint } from "@enums/api.enum";
import { HEADERS } from "@lib/constants/headers";
import { AppError } from "@/lib/error/types";
import { HttpStatus } from "@/enums/http.enum";

export interface PairApiResponse {
    data?: any;
    metaData?: {
        message?: string;
        status?: number;
    };
}

export interface GenerateQrResult {
  code: string;
  qrUrl?: string;
}

/**
 * Requests an official pairing code from the backend for the "Use Phone" QR
 * login flow on the login page. This is a *different* flow from
 * pairDevice()/PAIR below (which links a second device to an already
 * logged-in account, from /account-settings) — this one is how an
 * unauthenticated TV signs in at all.
 *
 * Replaces the old client-only random code generator: a code the backend has
 * never heard of can never be claimed by anything, which is why "Use Phone"
 * silently never completed — see USE_PHONE_FEATURE.md for the confirmed
 * contract this now matches.
 */
export async function generateQrCode(signal?: AbortSignal): Promise<GenerateQrResult | null> {
  try {
    const response = await apiClient.get<PairApiResponse>(ApiEndpoint.GENERATE_QR, { signal });
    const payload = (response?.data as any)?.data ?? response?.data ?? {};
    if (!payload?.code) return null;
    return { code: String(payload.code), qrUrl: payload.qr_url ?? payload.qrUrl };
  } catch {
    return null;
  }
}

export interface VerifyQrResult {
  verified: boolean;
  sessionId?: string;
  userId?: string;
  token?: string;
  phone?: string;
}

/**
 * Verifies a QR login `code` against the backend. Called from two places
 * against the *same* endpoint, which is what actually lets them meet:
 *  - the phone, once it opens the scanned deep link, with its own session
 *    attached (see useDeepLinkHandler.ts) — this is what "claims" the code.
 *  - the TV (QrPairingPanel.tsx), polling with no session attached, to
 *    discover once the phone has claimed it.
 * Fails closed (`verified: false`) on any error, including a not-yet-claimed
 * code — that's the expected/common case while the TV is still polling, not
 * a real failure.
 */
export async function verifyQrCode(code: string, sessionId?: string, signal?: AbortSignal): Promise<VerifyQrResult> {
  try {
    const response = await apiClient.post<PairApiResponse>(
      ApiEndpoint.VERIFY_QR,
      { code },
      {
        encrypt: true,
        signal,
        headers: sessionId ? { [HEADERS.SESSION_ID]: sessionId } : undefined,
      }
    );

    const payload = (response?.data as any)?.data ?? response?.data ?? {};
    const resultSessionId = payload?.session_id ?? payload?.sessionId;
    const userId = payload?.user_id ?? payload?.userId;

    return {
      verified: Boolean(resultSessionId && userId),
      sessionId: resultSessionId,
      userId,
      token: payload?.token,
      phone: payload?.phone,
    };
  } catch {
    return { verified: false };
  }
}

export async function pairDevice(code: string, sessionId?: string, signal?: AbortSignal) {
    const response = await apiClient.post<PairApiResponse>(
        ApiEndpoint.PAIR,
        { code },
        {
            encrypt: true,
            signal,
            headers: sessionId ? { [HEADERS.SESSION_ID]: sessionId } : undefined,
        }
    );

    const meta = response?.metaData;
    if (meta && meta.status !== undefined && meta.status !== 200) {
        throw new AppError(
            meta.message || "Invalid pairing code. Please try again.",
            (meta.status as HttpStatus) || HttpStatus.BAD_REQUEST
        );
    }

    return response;
}
