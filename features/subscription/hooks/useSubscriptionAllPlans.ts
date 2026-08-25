"use client";

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@store/useAuthStore';
import { getAllSubscriptionPlans, GetAllPlansPayload } from '../api/getAllPlans';
import { mapSubscriptionAllPlans } from '../model/mapper';
import { logger } from '@lib/logger/logger';

export function useSubscriptionAllPlans(
  payload: GetAllPlansPayload,
  enabled = true
) {
  const sessionId = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['subscription-all-plans', payload.country, payload.deviceTypeId, payload.languageId],
    queryFn: async () => {
      logger.info('[useSubscriptionAllPlans] Fetching subscription plans', payload);
      const response = await getAllSubscriptionPlans(payload, sessionId ?? undefined);
      return mapSubscriptionAllPlans(response);
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
