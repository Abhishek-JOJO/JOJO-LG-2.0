/**
 * User Payload Builder
 * 
 * Extracts user context from Zustand auth store
 */

import { useAuthStore } from '@/store/useAuthStore';
import type { UserContext } from '../model/context.types';

/**
 * Build user context payload from auth store.
 * Only includes fields that are non-null and non-undefined.
 */
export function buildUserPayload(): UserContext | undefined {
  const { user, isAuthenticated } = useAuthStore.getState();
  
  if (!isAuthenticated || !user) {
    return undefined;
  }
  
  return {
    user_id: user.id,
    ...(user.phone != null && { phone: user.phone }),
    ...(user.email != null && { email: user.email }),
    is_guest: user.isGuest ?? false,
    created_at: user.createdAt,
  } as UserContext;
}
