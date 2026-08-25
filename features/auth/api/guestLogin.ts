/**
 * Guest Login API
 * Returns raw API response
 */

import { apiClient } from "@lib/api/client";
import { ApiEndpoint } from "@enums/api.enum";
import type { GuestLoginRequest, ApiResponse } from "../model/types";

export async function guestLogin(request: GuestLoginRequest): Promise<ApiResponse<any>> {
  return apiClient.post<any>(ApiEndpoint.GUEST_LOGIN, request, { encrypt: true });
}
