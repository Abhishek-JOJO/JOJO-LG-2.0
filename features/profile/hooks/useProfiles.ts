/**
 * Profile Hooks
 * TanStack Query hooks for profile data
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfiles } from "../api/getProfiles";
import { createProfile } from "../api/createProfile";
import { mapProfilesResponse } from "../model/mapper";
import { useAuthStore } from "@store/useAuthStore";
import { logger } from "@lib/logger/logger";
import { handleError } from "@lib/error/handler";
import type { ApiResponse, CreateProfileRequest } from "../model/types";
import { appConfig } from "@/lib/config/app.config";

/**
 * Fetch profiles
 * 
 * ONLY enabled when:
 * - sessionId exists
 * - isAppReady is true (passed as parameter)
 */
export function useProfiles(isAppReady: boolean) {
  const sessionId = useAuthStore(state => state.token);
  const isGuest = useAuthStore(state => state.user?.isGuest);

  return useQuery({
    queryKey: ['profiles', sessionId],
    queryFn: async () => {
      logger.info('[Profiles Hook] Fetching profiles...', { sessionId: sessionId?.substring(0, 10) });

      const response = await getProfiles(sessionId ?? undefined) as ApiResponse<any>;

      logger.info('[Profiles Hook] Raw API response:', response);

      const mapped = mapProfilesResponse(response);

      logger.info('[Profiles Hook] Mapped profiles:', {
        profileCount: mapped.profiles.length,
        profiles: mapped.profiles,
        selectedProfile: mapped.selected_profile
      });

      return mapped;
    },
    enabled: !!sessionId && isAppReady && !isGuest,
    staleTime: appConfig.STALE_TIME, // 5 minutes
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });
}

/**
 * Create Profile
 * 
 * Hook for creating a new profile
 * Used during registration flow
 */
export function useCreateProfile() {
  const sessionId = useAuthStore(state => state.token);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProfileRequest) => {
      logger.info('[Create Profile Hook] Creating profile...', { data });

      if (!sessionId) {
        throw new Error('Session ID required to create profile');
      }

      const response = await createProfile(data, sessionId) as ApiResponse<any>;

      logger.info('[Create Profile Hook] Profile created:', response);

      return response;
    },
    onSuccess: (data) => {
      logger.info('[Create Profile Hook] Profile creation successful', { data });

      if (typeof document !== 'undefined') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const secureFlag = isLocal ? '' : 'secure; ';
        document.cookie = `jojo_has_profile=true; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
      }

      // Invalidate profiles query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['profiles', sessionId] });
      logger.info('[Create Profile Hook] Profiles query invalidated');
    },
    onError: (error) => {
      const message = handleError(error);
      logger.error('[Create Profile Hook] Profile creation failed', { message });
    },
  });
}
