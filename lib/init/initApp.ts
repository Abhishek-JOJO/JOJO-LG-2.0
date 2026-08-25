/**
 * App Initialization
 * Called once on app start to initialize stores from localStorage
 */

import { initAuth } from "@store/useAuthStore";
import { initProfile } from "@store/useProfileStore";
import { logger } from "@lib/logger/logger";
import { getBrowserUID } from "@lib/utils/deviceId";

export function initApp(): void {
  logger.info('[Init] Initializing app...');
  
  // Ensure the device ID is initialized and set in document.cookie for SSR
  getBrowserUID();
  
  // Initialize auth from localStorage
  initAuth();
  
  // Initialize profile from localStorage
  initProfile();
  
  logger.info('[Init] App initialized');
}
