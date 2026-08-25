/**
 * Profile Payload Builder
 * 
 * Extracts profile context from Zustand profile store
 */

import { useProfileStore } from '@/store/useProfileStore';
import type { ProfileContext } from '../model/context.types';

/**
 * Build profile context payload from profile store
 */
export function buildProfilePayload(): ProfileContext | undefined {
  const { selectedProfile } = useProfileStore.getState();
  
  if (!selectedProfile) {
    return undefined;
  }
  
  return {
    profile_id: selectedProfile.profile_id,
    profile_name: selectedProfile.profile_name,
    is_kid: selectedProfile.is_kid,
  };
}
