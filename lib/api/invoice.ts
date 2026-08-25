import { apiClient } from "./client";
import { ApiEndpoint } from "@enums/api.enum";
import { HEADERS } from "@lib/constants/headers";

export interface InvoiceItem {
    dCreatedAt: string;
    sInvoiceNumber: string;
    sPlanName: string;
}

export interface InvoiceApiResponse {
    data: {
        invoice: InvoiceItem[];
    };
    metaData: {
        message?: string;
        status?: number;
    };
}

export async function listInvoices(sessionId?: string, signal?: AbortSignal) {
    return apiClient.post<InvoiceApiResponse>(
        ApiEndpoint.GET_INVOICE,
        {},
        {
            encrypt: true,
            signal,
            headers: sessionId ? { [HEADERS.SESSION_ID]: sessionId } : undefined,
        }
    );
}
