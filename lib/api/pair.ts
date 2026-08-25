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

const PAIRING_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L — avoid visual ambiguity on a TV screen
const PAIRING_CODE_LENGTH = 6;

/**
 * Generates a random pairing code for the TV to display as a QR code / unique
 * code. Purely client-side — the code only becomes meaningful once a mobile
 * device calls `pairDevice(code, sessionId)` against it.
 */
export function generatePairingCode(): string {
  let code = "";
  for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
    code += PAIRING_CODE_CHARSET[Math.floor(Math.random() * PAIRING_CODE_CHARSET.length)];
  }
  return code;
}

export interface PairStatusResult {
  paired: boolean;
  sessionId?: string;
  userId?: string;
  phone?: string;
}

/**
 * Polls whether a TV-displayed pairing `code` has been claimed by a mobile
 * device yet.
 *
 * TODO(backend): `ApiEndpoint.PAIR_STATUS` and this response shape are a
 * best guess pending backend confirmation — adjust once the real contract
 * is known. Designed to fail closed (treated as "not yet paired") on any
 * error so an unconfirmed/missing endpoint doesn't break the QR/code display.
 */
export async function checkPairStatus(code: string, signal?: AbortSignal): Promise<PairStatusResult> {
  try {
    const response = await apiClient.get<PairApiResponse>(
      `${ApiEndpoint.PAIR_STATUS}?code=${encodeURIComponent(code)}`,
      { signal }
    );

    const payload = (response?.data as any)?.data ?? response?.data ?? {};
    const sessionId = payload?.session_id ?? payload?.sessionId;
    const userId = payload?.user_id ?? payload?.userId;

    return {
      paired: Boolean(payload?.paired ?? (sessionId && userId)),
      sessionId,
      userId,
      phone: payload?.phone,
    };
  } catch {
    return { paired: false };
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
