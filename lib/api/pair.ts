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
