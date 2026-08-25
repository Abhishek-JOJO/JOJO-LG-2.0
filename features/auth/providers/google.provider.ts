/**
 * Google Sign-In Provider
 * 
 * Handles Google Identity Services SDK
 * Returns access token via popup flow (works even without signed-in Google account)
 */

import { SocialMediaMethos } from '@/enums/ui.enum';
import { loadScript } from './loadScript';
import { isInitialized, markInitialized } from './sdkRegistry';
import { logger } from '@/lib/logger/logger';

const GOOGLE_SDK_URL = 'https://accounts.google.com/gsi/client';
const TIMEOUT_MS = 60000; // 60 seconds

// Extend Window interface for Google SDK
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          cancel: () => void;
        };
        oauth2: {
          initCodeClient: (config: any) => any;
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}

/**
 * Google User Info Response
 */
interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

/**
 * Google Token Response
 * Contains both the access token and user info
 */
export interface GoogleTokenResponse {
  accessToken: string;
  email: string;
  userInfo: GoogleUserInfo;
}

/**
 * Get Google access token and user info via popup
 * This method opens a popup for Google sign-in, which works even if the user
 * is not already signed into Google in their browser.
 * 
 * @returns Promise<GoogleTokenResponse> - Access token and user info
 * @throws Error if user cancels, timeout, or SDK fails
 */
export async function getGoogleToken(): Promise<GoogleTokenResponse> {
  // SSR safety
  if (typeof window === 'undefined') {
    throw new Error('Google login can only be used in browser');
  }

  logger.info('[Google Login] Starting...');

  // Load Google SDK
  try {
    await loadScript(GOOGLE_SDK_URL);
    logger.info('[Google Login] SDK loaded');
  } catch (error) {
    logger.error('[Google Login] Failed to load SDK', error);
    throw new Error('Failed to load Google SDK');
  }

  // Check if SDK loaded properly
  if (!window.google?.accounts?.oauth2) {
    logger.error('[Google Login] SDK not available');
    throw new Error('Google SDK not available');
  }

  // Get client ID from environment
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    logger.error('[Google Login] Client ID not configured');
    throw new Error('Google Client ID not configured');
  }

  logger.info('[Google Login] Initializing token client...');

  return new Promise<GoogleTokenResponse>((resolve, reject) => {
    // Set timeout
    const timeoutId = setTimeout(() => {
      logger.warn('[Google Login] Timeout');
      reject(new Error('Google login timeout - user did not respond'));
    }, TIMEOUT_MS);

    try {
      // Use OAuth2 Token Client for popup flow
      // This opens a popup window where users can sign in to Google
      const tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (response: any) => {
          clearTimeout(timeoutId);
          
          logger.info('[Google Login] Callback received', { 
            hasError: !!response.error,
            hasToken: !!response.access_token 
          });
          
          if (response.error) {
            logger.error('[Google Login] Error in callback', response.error);
            reject(new Error(response.error_description || response.error));
            return;
          }
          
          if (response.access_token) {
            try {
              logger.info('[Google Login] Access token received, fetching user info...');
              
              // Fetch user info using the access token
              const userInfo = await fetchGoogleUserInfo(response.access_token);
              
              logger.info('[Google Login] User info received', {
                email: userInfo.email,
                name: userInfo.name,
                email_verified: userInfo.email_verified
              });
              
              resolve({
                accessToken: response.access_token,
                email: userInfo.email,
                userInfo: userInfo
              });
            } catch (error) {
              logger.error('[Google Login] Failed to fetch user info', error);
              reject(error);
            }
          } else {
            logger.error('[Google Login] No access token in response');
            reject(new Error('No access token received from Google'));
          }
        },
        error_callback: (error: any) => {
          clearTimeout(timeoutId);
          logger.error('[Google Login] Error callback', error);
          reject(new Error(error.message || 'Google login failed'));
        },
      });

      logger.info('[Google Login] Requesting access token (opening popup)...');
      
      // Request access token - this opens the popup
      tokenClient.requestAccessToken();
      
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error('[Google Login] Exception during initialization', error);
      reject(error);
    }
  });
}

/**
 * Fetch user info from Google using access token
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
    }

    const userInfo: GoogleUserInfo = await response.json();
    
    if (!userInfo.email) {
      throw new Error('No email in user info response');
    }
    
    return userInfo;
  } catch (error) {
    logger.error('[Google Login] Failed to fetch user info', error);
    throw new Error('Failed to get Google user info');
  }
}

/**
 * Alternative: Get Google ID token via One Tap (requires user to be signed in to Google)
 * Use this as a fallback or for returning users
 */
export async function getGoogleTokenViaOneTap(): Promise<string> {
  // SSR safety
  if (typeof window === 'undefined') {
    throw new Error('Google login can only be used in browser');
  }

  // Load Google SDK
  try {
    await loadScript(GOOGLE_SDK_URL);
  } catch (error) {
    throw new Error('Failed to load Google SDK');
  }

  // Check if SDK loaded properly
  if (!window.google?.accounts?.id) {
    throw new Error('Google SDK not available');
  }

  // Get client ID from environment
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google Client ID not configured');
  }

  return new Promise<string>((resolve, reject) => {
    // Set timeout
    const timeoutId = setTimeout(() => {
      reject(new Error('Google login timeout - user did not respond'));
    }, TIMEOUT_MS);

    // Initialize SDK (only once)
    if (!isInitialized(SocialMediaMethos.GOOGLE)) {
      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          clearTimeout(timeoutId);
          
          if (response.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('No credential received from Google'));
          }
        },
        cancel_on_tap_outside: false,
        use_fedcm_for_prompt: false,
      });
      
      markInitialized(SocialMediaMethos.GOOGLE);
    }

    // Prompt user for sign-in using One Tap
    // This will fail with "Provider's accounts list is empty" if user not signed in
    window.google!.accounts.id.prompt((notification: any) => {
      clearTimeout(timeoutId);
      
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap not available, reject with specific error
        reject(new Error('Google One Tap not available - user not signed in to Google'));
      }
    });
  });
}

/**
 * Cancel Google sign-in (cleanup)
 */
export function cancelGoogleLogin(): void {
  if (typeof window !== 'undefined' && window.google?.accounts?.id) {
    window.google.accounts.id.cancel();
  }
}
