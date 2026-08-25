/**
 * Facebook Login Provider
 * 
 * Handles Facebook JavaScript SDK
 * Returns access token via popup flow
 */

import { appConfig } from '@/lib/config/app.config';
import { loadScript } from './loadScript';
import { isInitialized, markInitialized } from './sdkRegistry';
import { SocialMediaMethos } from '@/enums/ui.enum';

// Extend Window interface for Facebook SDK
declare global {
  interface Window {
    FB?: {
      init: (params: any) => void;
      login: (callback: (response: any) => void, options?: any) => void;
      getLoginStatus: (callback: (response: any) => void) => void;
      api: (path: string, params: any, callback: (response: any) => void) => void;
    };
    fbAsyncInit?: () => void;
  }
}

/**
 * Initialize Facebook SDK
 */
function initializeFacebookSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already initialized
    if (isInitialized(SocialMediaMethos.FACEBOOK)) {
      resolve();
      return;
    }

    // Get App ID from environment
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      reject(new Error('Facebook App ID not configured'));
      return;
    }

    // Define async init callback
    window.fbAsyncInit = () => {
      if (!window.FB) {
        reject(new Error('Facebook SDK not loaded'));
        return;
      }

      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: true,
        version: 'v18.0',
      });

      markInitialized(SocialMediaMethos.FACEBOOK);
      resolve();
    };

    // Load SDK
    loadScript(appConfig.FACEBOOK_SDK_URL).catch((error) => {
      reject(new Error('Failed to load Facebook SDK'));
    });
  });
}

/**
 * Get Facebook access token via popup
 * 
 * @returns Promise<string> - Facebook access token
 * @throws Error if user cancels, timeout, or SDK fails
 */
export async function getFacebookToken(): Promise<string> {
  // SSR safety
  if (typeof window === 'undefined') {
    throw new Error('Facebook login can only be used in browser');
  }

  // Initialize SDK
  try {
    await initializeFacebookSDK();
  } catch (error) {
    throw error;
  }

  // Check if SDK is available
  if (!window.FB) {
    throw new Error('Facebook SDK not available');
  }

  return new Promise<string>((resolve, reject) => {
    // Set timeout
    const timeoutId = setTimeout(() => {
      reject(new Error('Facebook login timeout - user did not respond'));
    }, appConfig.FACEBOOK_TIMEOUT_MS);

    // Trigger Facebook login popup
    window.FB!.login(
      (response: any) => {
        clearTimeout(timeoutId);

        // Check if user authorized the app
        if (response.authResponse) {
          const accessToken = response.authResponse.accessToken;

          if (accessToken) {
            resolve(accessToken);
          } else {
            reject(new Error('No access token received from Facebook'));
          }
        } else {
          // User cancelled login or did not fully authorize
          reject(new Error('User cancelled Facebook login or denied permissions'));
        }
      },
      {
        scope: 'email,public_profile',
        return_scopes: true,
      }
    );
  });
}

/**
 * Get Facebook user email
 * 
 * @param accessToken - Facebook access token
 * @returns Promise<string> - User email
 */
export async function getFacebookUserEmail(accessToken: string): Promise<string> {
  if (typeof window === 'undefined' || !window.FB) {
    throw new Error('Facebook SDK not available');
  }

  return new Promise((resolve, reject) => {
    window.FB!.api(
      '/me',
      { fields: 'email', access_token: accessToken },
      (response: any) => {
        if (response.email) {
          resolve(response.email);
        } else {
          reject(new Error('No email returned from Facebook'));
        }
      }
    );
  });
}

/**
 * Check Facebook login status (optional utility)
 */
export function checkFacebookLoginStatus(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.FB) {
      reject(new Error('Facebook SDK not available'));
      return;
    }

    window.FB.getLoginStatus((response: any) => {
      resolve(response);
    });
  });
}
