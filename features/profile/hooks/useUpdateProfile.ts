/**
 * Update Profile Hook
 */

import { analyticsService } from "@/shared/analytics";
import { EVENT_NAMES } from "@/shared/analytics/constants/analytics.constants";
import { handleError } from "@lib/error/handler";
import { logger } from "@lib/logger/logger";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile } from "../api/updateProfile";
import { mapProfile } from "../model/mapper";
import type { ApiResponse, UpdateProfileRequest } from "../model/types";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const sessionId = useAuthStore(state => state.token);

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const response = await updateProfile(data, sessionId ?? undefined) as ApiResponse<any>;
      return mapProfile(response.data);
    },
    onSuccess: (updatedProfile) => {
      logger.info("[Update Profile Hook] Profile updated successfully", { updatedProfile });

      // Invalidate profiles query to refetch
      queryClient.invalidateQueries({ queryKey: ['profiles'] });

      // Check if this profile is the currently selected profile and sync it in the store
      const currentSelected = useProfileStore.getState().selectedProfile;
      if (currentSelected && currentSelected.profile_id === updatedProfile.profile_id) {
        logger.info('[Update Profile Hook] Syncing updated selected profile in store', updatedProfile);
        useProfileStore.getState().setSelectedProfile(updatedProfile, false);
      }

      // Track profile updated and profile edited
      try {
        analyticsService.track(EVENT_NAMES.PROFILE_EDITED, {
          profile_id: updatedProfile.profile_id,
          profile_name: updatedProfile.profile_name,
        });
      } catch (err) { }
    },
    onError: (error) => {
      handleError(error);
    },
  });
}
