/**
 * Get All Subscription Plans API — POST /subscription/allplans
 * Returns all available subscription plans with pricing and features.
 */

import { apiClient } from '@lib/api/client';
import { ApiEndpoint } from '@enums/api.enum';
import type { ApiResponse } from '@lib/types/api.types';
import type { SubscriptionAllPlansApiShape } from '../model/types';

export interface GetAllPlansPayload {
  country: string;
  deviceTypeId: number;
  languageId: number;
}

export async function getAllSubscriptionPlans(
  payload: GetAllPlansPayload,
  sessionId?: string
): Promise<ApiResponse<SubscriptionAllPlansApiShape>> {
  return apiClient.post<ApiResponse<SubscriptionAllPlansApiShape>>(
    ApiEndpoint.SUBSCRIPTION_ALL_PLANS,
    payload,
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : {},
    }
  );
}
