/**
 * Create Profile Hook
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProfile } from "../api/createProfile";
import { mapProfile } from "../model/mapper";
import { useAuthStore } from "@store/useAuthStore";
import { handleError } from "@lib/error/handler";
import type { CreateProfileRequest, ApiResponse } from "../model/types";
import { analyticsService } from "@/shared/analytics";

export function useCreateProfile() {
  const queryClient = useQueryClient();
  const sessionId = useAuthStore(state => state.token);
  
  return useMutation({
    mutationFn: async (data: CreateProfileRequest) => {
      const response = await createProfile(data, sessionId ?? undefined) as ApiResponse<any>;
      return mapProfile(response.data);
    },
    onSuccess: (profile) => {
      // Invalidate profiles query to refetch
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      try {
        analyticsService.trackProfileCreated({
          profile_id: profile.profile_id,
          profile_name: profile.profile_name,
          is_kid: profile.is_kid,
        });
      } catch (err) {}
    },
    onError: (error) => {
      handleError(error);
    },
  });
}
