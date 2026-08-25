import { apiClient } from "./client";
import { ApiEndpoint } from "@enums/api.enum";
import { HEADERS } from "@lib/constants/headers";

export interface VerifySubscriptionResponse {
    data?: VerifySubscriptionData;
    metaData?: VerifySubscriptionMetaData;
}

export interface VerifySubscriptionData {
    planType?: string;
    subscription?: Subscription;
    oneTime?: OneTimeSubscription | null;
}

export interface Subscription {
    iUserId?: string;
    dEndDate?: string;
    dStartDate?: string;
    nCurrentBillingCycle?: number;
    sPaymentProviderId?: string;
    sToken?: string;
    oGroupTranslation?: Translation;
    oProductTranslation?: Translation;
    aFeatures?: SubscriptionFeature[];
    oProviderSku?: ProviderSku;
    sProjectId?: string;
    sGroupId?: string;
    sProductId?: string;
    sSubProductLabel?: string;
    nValidityCount?: number;
    nValidityDays?: number;
    sValidityDuration?: string;
    bShowPriceComparison?: boolean;
    nDisplayMarkupPercent?: number;
    oOffer?: SubscriptionOffer | null;
}

export interface Translation {
    sDescription?: string;
    sName?: string;
    sTitle?: string;
}

export interface SubscriptionFeature {
    sFeatureId?: string;
    eFeatureType?: string;
    vFeatureValue?: string | number | boolean;
    sFeatureImageUrl?: string;
    sFeatureName?: string;
}

export interface ProviderSku {
    sProviderSkuId?: string;
    sProviderSkuLabel?: string;
}

export interface SubscriptionOffer {
    [key: string]: unknown;
}

export interface OneTimeSubscription {
    [key: string]: unknown;
}

export interface VerifySubscriptionMetaData {
    message?: string;
    status?: number;
}

export async function verifySubscription(countryCode: string, sessionId?: string, signal?: AbortSignal) {
    return apiClient.post<VerifySubscriptionResponse>(
        ApiEndpoint.VERIFY_SUBSCRIPTION,
        { countryCode },
        {
            encrypt: true,
            signal,
            headers: sessionId ? { [HEADERS.SESSION_ID]: sessionId } : undefined,
        }
    );
}
