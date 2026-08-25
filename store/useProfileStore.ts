/**
 * Profile Store
 * 
 * Stores ONLY selectedProfile
 * DO NOT store profiles list (React Query manages that)
 */

import { create } from "zustand";
import { StorageKey } from "@enums/storage.enum";
import { localStorageManager } from "@lib/localStorage/localStorage.manager";
import { logger } from "@/lib/logger/logger";
import { analyticsService } from "@/shared/analytics";

export interface Profile {
  profile_id: string;
  profile_name: string;
  avatar: string;
  is_kid: boolean;
}

interface ProfileStore {
  selectedProfile: Profile | null;
  hasUserSelectedProfile: boolean; // Track if user manually selected

  setSelectedProfile: (profile: Profile, isUserSelection?: boolean) => void;
  clearSelectedProfile: () => void;
}

/**
 * Profile Store (Zustand)
 * 
 * CRITICAL RULES:
 * - Store ONLY selectedProfile
 * - hasUserSelectedProfile tracks manual selection
 * - BEFORE user selection → API can set profile
 * - AFTER user selection → STORE is source of truth
 */
export const useProfileStore = create<ProfileStore>((set, get) => ({
  selectedProfile: null,
  hasUserSelectedProfile: false,

  /**
   * Set selected profile
   * @param profile - Profile to select
   * @param isUserSelection - True if user manually selected (default: false)
   * 
   * ANALYTICS FLOW:
   * 
   * INITIAL PROFILE SELECTION (from /watching after login):
   *   - User selects profile for first time
   *   - hasUserSelectedProfile: false → true
   *   - Triggers: profile_selected ONLY
   *   - Does NOT trigger: profile_switched
   * 
   * PROFILE SWITCHING (from Settings after already logged in):
   *   - User changes profile
   *   - hasUserSelectedProfile: already true
   *   - Triggers: profile_switched FIRST, then profile_selected
   * 
   * AUTO-SELECT (API sets initial profile, not user):
   *   - isUserSelection: false
   *   - hasUserSelectedProfile: remains false
   *   - Triggers: profile_selected ONLY
   *   - Does NOT trigger: profile_switched
   */
  setSelectedProfile: (profile, isUserSelection = false) => {
    logger.info('[Profile Store] Setting selected profile', {
      profile_id: profile.profile_id,
      profile_name: profile.profile_name,
      isUserSelection,
      currentHasUserSelected: get().hasUserSelectedProfile
    });

    // Track profile analytics
    try {
      const currentHasUserSelected = get().hasUserSelectedProfile;
      
      // RULE: Initial profile selection (first time user selects profile)
      // → Trigger ONLY profile_selected
      // RULE: Profile switch (changing profile after already having selected one)
      // → Trigger BOTH profile_selected AND profile_switched
      
      if (isUserSelection && currentHasUserSelected) {
        // User is switching from one profile to another
        const currentProfile = get().selectedProfile;
        analyticsService.trackProfileSwitched({
          from_profile_id: currentProfile?.profile_id ?? "",
          from_profile_name: currentProfile?.profile_name,
          to_profile_id: profile.profile_id,
          to_profile_name: profile.profile_name,
        });
      }
      
      // Always track profile_selected for any profile selection (user or automatic)
      analyticsService.trackProfileSelected({
        profile_id: profile.profile_id,
        profile_name: profile.profile_name,
        is_kid: profile.is_kid,
      });
    } catch (e) {
      logger.warn('[Profile Store] Failed to track profile switch/selection', e);
    }

    // Persist to localStorage
    localStorageManager.set(StorageKey.SELECTED_PROFILE, profile);

    // Update state
    set((state) => ({
      selectedProfile: profile,
      // If this is a user selection, set to true
      // Otherwise, keep the existing value
      hasUserSelectedProfile: isUserSelection ? true : state.hasUserSelectedProfile,
    }));

    // Log after update
    setTimeout(() => {
      logger.info('[Profile Store] Profile set complete', {
        selectedProfile: get().selectedProfile?.profile_name,
        hasUserSelectedProfile: get().hasUserSelectedProfile
      });
    }, 0);
  },

  /**
   * Clear selected profile
   */
  clearSelectedProfile: () => {
    localStorageManager.remove(StorageKey.SELECTED_PROFILE);

    set({
      selectedProfile: null,
      hasUserSelectedProfile: false,
    });
  },
}));

/**
 * Initialize profile from localStorage on app start
 */
export function initProfile(): void {
  const savedProfile = localStorageManager.get<Profile>(StorageKey.SELECTED_PROFILE);

  if (savedProfile) {
    useProfileStore.setState({
      selectedProfile: savedProfile,
      hasUserSelectedProfile: true, // Assume persisted profile was user-selected
    });
  }
}
