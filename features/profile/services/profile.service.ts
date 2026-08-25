/**
 * Profile Service
 * 
 * ONLY contains business logic and orchestration
 * NO React Query usage
 * NO UI/DOM access
 */

import { socketClient } from "@lib/socket/socket.client";
import { logger } from "@lib/logger/logger";
import type { Profile } from "../model/types";

/**
 * Select Profile (Non-Blocking)
 * 
 * Emits encrypted socket request using "req" protocol
 * Does NOT wait for ACK - returns immediately
 * 
 * Backend Protocol:
 * socket.emit("req", { data: encrypt({ en: "select-profile", profile_id: string }) })
 * 
 * @param profile - Profile to select
 * @returns Promise<Profile> - Resolves immediately
 */
export async function selectProfile(profile: Profile): Promise<Profile> {
  logger.info('[Profile Service] Selecting profile', { 
    profile_id: profile.profile_id,
    profile_name: profile.profile_name 
  });
  
  // Emit encrypted request (non-blocking)
  if (socketClient.isConnected) {
    socketClient.emitRequest('select-profile', {
      profile_id: profile.profile_id,
    }, true); // true = enable encryption
    
    socketClient.emitRequest('continue-watching', {}, true);
    
    logger.info('[Profile Service] Socket requests emitted (select-profile + continue-watching)');
  } else {
    logger.warn('[Profile Service] Socket not connected, skipping emit');
  }
  
  // Return immediately (optimistic update)
  return profile;
}
