"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/useAuthStore';
import { getProfessionalAssets } from '../api/getProfessionalAssets';
import { logger } from '@lib/logger/logger';

export function useProfessionalAssets(professionalId: string | number, enabled = true) {
  const sessionId = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['professional-assets', professionalId, sessionId],
    queryFn: async () => {
      logger.info('[useProfessionalAssets] Fetching', { professionalId });
      const response = await getProfessionalAssets(
        Number(professionalId),
        sessionId ?? undefined,
        20,
        1
      );
      if (!response.data) {
        throw new Error('Professional assets API returned null data');
      }
      logger.info('[useProfessionalAssets] Fetched data successfully', { 
        id: professionalId, 
        name: response.data.professional?.professional_name,
        assetsCount: response.data.assets?.length ?? 0
      });
      return response.data;
    },
    enabled: !!professionalId && enabled,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
