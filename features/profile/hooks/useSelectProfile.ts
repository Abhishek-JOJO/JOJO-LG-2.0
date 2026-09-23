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
      // Invalidate profile-dependent queries, while preserving user session queries (verify-subscription & appNavigation)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key !== "verify-subscription" && key !== "appNavigation";
        },
      });
      // A file:// webOS build cannot perform Next.js RSC refresh requests.
      // The optimistic store update and query invalidation above already update
      // every profile-dependent client view; refreshing here only tears through
      // the route loading state on TV.
      if (typeof window === "undefined" || window.location.protocol !== "file:") {
        router.refresh();
      }
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
