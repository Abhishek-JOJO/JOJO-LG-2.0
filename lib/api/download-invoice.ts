import { apiClient } from "./client";
import { ApiEndpoint } from "@enums/api.enum";
import { HEADERS } from "@lib/constants/headers";

export interface InvoiceDetails {
    sOrderId: string;
    dCreatedAt: string;
    dEndDate: string;
    nCgstAmount: number;
    nIgstAmount: number;
    nSgstAmount: number;
    nSubTotalAmount: number;
    nTotal: number;
    nTotalTaxAmount: number;
    sBankRefNumber: string;
    sCountryName: string;
    sCurrency: string;
    sCurrencySymbol: string;
    sInvoiceNumber: string;
    sMaskedId: string;
    sPaymentMethod: string;
    sPaymentMode: string;
    sPlanName: string;
    sRegion: string;
    sState: string;
    sName: string;
    sEmail: string;
    sMobNum: string;
    sHSNCode: number;
}

export interface DownloadInvoiceApiResponse {
    data: {
        invoice: InvoiceDetails;
    };
    metaData: {
        message?: string;
        status?: number;
    };
}

export async function downloadInvoice(
    sInvoiceNumber: string,
    sessionId?: string,
    signal?: AbortSignal
) {
    return apiClient.post<DownloadInvoiceApiResponse>(
        ApiEndpoint.DOWNLOAD_INVOICE,
        { sInvoiceNumber },
        {
            encrypt: true,
            signal,
            headers: sessionId ? { [HEADERS.SESSION_ID]: sessionId } : undefined,
        }
    );
}
