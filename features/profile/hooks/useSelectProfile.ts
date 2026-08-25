import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { selectProfile } from "../services/profile.service";
import { useProfileStore } from "@store/useProfileStore";
import { handleError } from "@lib/error/handler";
import { logger } from "@lib/logger/logger";
import type { Profile } from "../model/types";

export function useSelectProfile() {
  const setSelectedProfile = useProfileStore(state => state.setSelectedProfile);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (profile: Profile) => {
      return await selectProfile(profile);
    },
    onMutate: (profile) => {
      logger.info('[Select Profile Hook] Optimistically updating profile', {
        profile_id: profile.profile_id,
        profile_name: profile.profile_name
      });

      setSelectedProfile(profile, true); // true = user selection
    },
    onSuccess: (profile) => {
      logger.info('[Select Profile Hook] Profile selection complete', {
        profile_id: profile.profile_id
      });
      queryClient.invalidateQueries();
      router.refresh();
    },
    onError: (error, profile) => {
      logger.error('[Select Profile Hook] Profile selection failed', {
        profile_id: profile.profile_id,
        error
      });
      handleError(error);
    },
  });
}
