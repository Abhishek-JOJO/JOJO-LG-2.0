import { apiClient } from '@lib/api/client';
import type { ApiResponse } from '@lib/types/api.types';

export interface ProfessionalDetails {
  professional: {
    professional_id: number;
    first_name: string;
    last_name: string;
    professional_name: string;
    name_analytics: string;
    professions: string[];
    image: string;
    known_for?: string;
    description?: string;
    dob?: string;
    height?: string;
  };
  assets: any[];
}

export async function getProfessionalAssets(
  professionalId: number,
  sessionId?: string,
  limit: number = 20,
  page: number = 1
): Promise<ApiResponse<ProfessionalDetails>> {
  return apiClient.post<ApiResponse<ProfessionalDetails>>(
    '/professional/assets',
    {
      limit,
      professionalId,
      page,
    },
    {
      encrypt: true,
      headers: sessionId ? { sessionid: sessionId } : undefined,
    }
  );
}
