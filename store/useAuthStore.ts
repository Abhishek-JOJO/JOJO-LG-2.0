import { create } from "zustand";
import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import type { User, AuthState } from "@features/auth/model/types";
import { analyticsService } from "@/shared/analytics";
import { AttributionManager } from "@/lib/deeplink/attributionManager";

interface AuthStore extends AuthState {
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setGuestAuth: (token: string, guestId: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

/**
 * Auth Store (Zustand)
 * 
 * Manages authentication state globally
 * Persists tokens to localStorage
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,

  /**
   * Set authenticated user
   */
  setAuth: (user, token, refreshToken) => {
    // Persist tokens and user details
    localStorageManager.set(StorageKey.AUTH_TOKEN, token);
    localStorageManager.set(StorageKey.REFRESH_TOKEN, refreshToken);
    localStorageManager.set(StorageKey.USER, user);

    if (typeof document !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const secureFlag = isLocal ? '' : 'secure; ';
      document.cookie = `jojo_auth_token=${token}; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
      document.cookie = `jojo_is_guest=false; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
    }

    // Update state
    set({
      isAuthenticated: true,
      user,
      token,
      refreshToken,
    });
  },

  /**
   * Set guest user
   */
  setGuestAuth: (token, guestId) => {
    const guestUser: User = {
      id: guestId,
      phone: "",
      isGuest: true,
      createdAt: new Date().toISOString(),
    };

    // Persist token and guest user details
    localStorageManager.set(StorageKey.AUTH_TOKEN, token);
    localStorageManager.set(StorageKey.USER, guestUser);

    if (typeof document !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const secureFlag = isLocal ? '' : 'secure; ';
      document.cookie = `jojo_auth_token=${token}; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
      document.cookie = `jojo_is_guest=true; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
    }

    // Update state with guest user
    set({
      isAuthenticated: true,
      user: guestUser,
      token,
      refreshToken: null,
    });
  },

  /**
   * Clear authentication
   * NOTE: Analytics (logout, session_end) are tracked in useLogout hook, not here.
   * This method only handles state/storage cleanup.
   */
  clearAuth: () => {
    // Reset attribution session
    AttributionManager.clearSession();
    
    // Reset analytics user
    analyticsService.resetUser();
    
    // Remove tokens from storage
    localStorageManager.remove(StorageKey.AUTH_TOKEN);
    localStorageManager.remove(StorageKey.REFRESH_TOKEN);
    localStorageManager.remove(StorageKey.USER);

    if (typeof document !== 'undefined') {
      document.cookie = `jojo_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `jojo_is_guest=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `jojo_has_profile=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }

    // Reset state
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
    });
  },

  /**
   * Update user data
   */
  updateUser: (userData) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const updatedUser = {
      ...currentUser,
      ...userData,
    };
    localStorageManager.set(StorageKey.USER, updatedUser);

    set({
      user: updatedUser,
    });
  },
}));

/**
 * Initialize auth from localStorage on app start
 */
export function initAuth(): void {
  const token = localStorageManager.get<string>(StorageKey.AUTH_TOKEN);
  const refreshToken = localStorageManager.get<string>(StorageKey.REFRESH_TOKEN);
  const user = localStorageManager.get<User>(StorageKey.USER);

  if (token) {
    // Validate token and fetch user data
    // For now, just set authenticated state
    useAuthStore.setState({
      isAuthenticated: true,
      token,
      refreshToken,
      user,
    });
    
    // Sync the token to cookie for SSR and Middleware compatibility
    if (typeof document !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const secureFlag = isLocal ? '' : 'secure; ';
      document.cookie = `jojo_auth_token=${token}; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
      document.cookie = `jojo_is_guest=${user?.isGuest ? 'true' : 'false'}; path=/; max-age=31536000; ${secureFlag}samesite=lax`;
    }
  }
}
