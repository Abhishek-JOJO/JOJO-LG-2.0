/**
 * Logout Hook
 * 
 * Handles complete logout flow:
 * - Clear auth store
 * - Clear profile store
 * - Clear React Query cache
 * - Disconnect socket
 * - Clear localStorage
 * - Redirect to login
 */

"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { disconnectSocket } from "@lib/socket/connectSocket";
import { releaseLock } from "@lib/socket/socket.lock";
import { logger } from "@/lib/logger/logger";
import { ROUTES } from "@/lib/constants/routes";
import { analyticsService } from "@/shared/analytics";
import { tvNavigate } from "@/src/navigation/tvNavigate";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore(state => state.clearAuth);
  const clearSelectedProfile = useProfileStore(state => state.clearSelectedProfile);

  const logout = () => {
    logger.info('[Logout] Starting logout process...');

    try {
      analyticsService.trackLogout();
      analyticsService.trackSessionEnd({ session_id: '' });
    } catch (e) {
      logger.warn('[Logout] Failed to track logout event', e);
    }

    try {
      // 1. Clear auth store (also clears localStorage tokens)
      clearAuth();
      logger.info('[Logout] ✅ Auth store cleared');

      // 2. Clear profile store
      clearSelectedProfile();
      logger.info('[Logout] ✅ Profile store cleared');

      // 3. Disconnect socket and release lock
      disconnectSocket();
      releaseLock();
      logger.info('[Logout] ✅ Socket disconnected');

      // 4. Clear React Query cache
      queryClient.clear();
      logger.info('[Logout] ✅ React Query cache cleared');

      // 5. Clear any remaining localStorage items (optional - be selective)
      // Note: We keep geo cache and country cache for better UX
      try {
        // Clear only auth-related items
        localStorage.removeItem('apple_login_in_progress');
        // Add other auth-specific keys if needed
      } catch (e) {
        logger.warn('[Logout] Could not clear some localStorage items', { error: e });
      }

      logger.info('[Logout] ✅ Logout complete, redirecting to login');

      // 6. Redirect to login with full page reload to clear all React state and Suspense
      // boundaries. tvNavigate (not window.location.replace directly) is required here:
      // on the packaged webOS build the app runs from file://, where an absolute path
      // like "/login" resolves against the filesystem root instead of the app's install
      // dir, so it fails to load and webOS's Web App Manager shows its own error page —
      // which has no spatial-navigation focus handling, so the remote appears dead.
      tvNavigate(ROUTES.LOGIN, router, { replace: true });
    } catch (error) {
      logger.error('[Logout] Error during logout', { error });
      // Still redirect to login even if there's an error
      tvNavigate(ROUTES.LOGIN, router, { replace: true });
    }
  };

  return { logout };
}
