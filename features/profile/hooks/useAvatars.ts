/**
 * Avatars Hook
 */

import { useQuery } from "@tanstack/react-query";
import { getAvatars } from "../api/getAvatars";
import { mapAvatarsResponse } from "../model/mapper";
import type { ApiResponse, Avatar } from "../model/types";
import { useAuthStore } from "@/store/useAuthStore";

type UseAvatarsOptions = {
  page?: number;
  limit?: number;
  enabled?: boolean;
};

type UseAllAvatarsOptions = {
  limit?: number;
  enabled?: boolean;
};

export function useAvatars({ page = 1, limit = 20, enabled = true }: UseAvatarsOptions = {}) {
  const sessionId = useAuthStore(state => state.token);

  return useQuery({
    queryKey: ['avatars', sessionId, page, limit],
    queryFn: async () => {
      const response = await getAvatars(page, limit, sessionId ?? undefined) as ApiResponse<any>;
      return mapAvatarsResponse(response);
    },
    enabled: enabled && !!sessionId,
    staleTime: Infinity, // Cache forever
    gcTime: Infinity,
  });
}

export function useAllAvatars({ limit = 100, enabled = true }: UseAllAvatarsOptions = {}) {
  const sessionId = useAuthStore(state => state.token);

  return useQuery({
    queryKey: ['avatars', 'all', sessionId, limit],
    queryFn: async () => {
      const avatars: Avatar[] = [];
      let page = 1;

      while (page <= 50) {
        const response = await getAvatars(page, limit, sessionId ?? undefined) as ApiResponse<any>;
        const pageAvatars = mapAvatarsResponse(response);

        avatars.push(...pageAvatars);

        if (pageAvatars.length < limit) {
          break;
        }

        page += 1;
      }

      const seen = new Set<string>();

      return avatars.filter((avatar) => {
        const key = String(avatar.avatar_id || avatar.url);

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
    },
    enabled: enabled && !!sessionId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
