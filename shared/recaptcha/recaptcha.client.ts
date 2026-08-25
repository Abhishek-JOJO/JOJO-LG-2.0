
/**
 * reCAPTCHA v3 Client
 * 
 * RESPONSIBILITIES ONLY:
 * - Load Google reCAPTCHA v3 script
 * - Execute reCAPTCHA and get token
 * 
 * RULES:
 * - NO API calls
 * - NO business logic
 * - NO score validation
 * - SSR safe
 * - Singleton script loading
 */

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger/logger';

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-v3';
const RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js';

let scriptLoadPromise: Promise<void> | null = null;

/**
 * Load reCAPTCHA v3 script (singleton pattern)
 * Prevents duplicate script injection
 * 
 * @returns Promise that resolves when script is loaded
 */
export async function loadRecaptchaScript(): Promise<void> {
  // SSR guard
  if (typeof window === 'undefined') {
    logger.warn('[reCAPTCHA] Cannot load script during SSR');
    throw new Error('reCAPTCHA script can only be loaded in browser');
  }

  // Check if site key is configured
  if (!env.recaptchaSiteKey) {
    logger.error('[reCAPTCHA] Site key not configured');
    logger.error('[reCAPTCHA] CRITICAL: Site key is missing!');
    throw new Error('reCAPTCHA site key is not configured');
  }

  logger.info('[reCAPTCHA] Site key found:', env.recaptchaSiteKey.substring(0, 10) + '...');

  // Return existing promise if already loading
  if (scriptLoadPromise) {
    logger.info('[reCAPTCHA] Script already loading, reusing promise');
    return scriptLoadPromise;
  }

  // Check if already loaded
  if (document.getElementById(RECAPTCHA_SCRIPT_ID)) {
    logger.info('[reCAPTCHA] Script already loaded');
    return Promise.resolve();
  }

  // Create new load promise
  logger.info('[reCAPTCHA] Starting script injection...');
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `${RECAPTCHA_SCRIPT_URL}?render=${env.recaptchaSiteKey}`;
    script.async = true;
    script.defer = true;

    logger.info('[reCAPTCHA] Script URL:', script.src);

    script.onload = () => {
      logger.info('[reCAPTCHA] Script loaded successfully');
      resolve();
    };

    script.onerror = (error) => {
      logger.error('[reCAPTCHA] Failed to load script', { error });
      scriptLoadPromise = null; // Reset so it can be retried
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
    logger.info('[reCAPTCHA] Script tag appended to head');
  });

  return scriptLoadPromise;
}

/**
 * Execute reCAPTCHA and get token
 * 
 * @param action - Action name (e.g., 'register', 'login')
 * @returns Promise with reCAPTCHA token
 */
export async function executeRecaptcha(action: string): Promise<string> {
  // SSR guard
  if (typeof window === 'undefined') {
    logger.warn('[reCAPTCHA] Cannot execute during SSR');
    throw new Error('reCAPTCHA can only be executed in browser');
  }

  // Check if site key is configured
  if (!env.recaptchaSiteKey) {
    logger.error('[reCAPTCHA] Site key not configured');
    throw new Error('reCAPTCHA site key is not configured');
  }

  logger.info('[reCAPTCHA] Executing for action:', action);

  // Ensure script is loaded
  if (!window.grecaptcha) {
    logger.info('[reCAPTCHA] Script not loaded, loading now');
    await loadRecaptchaScript();

    // Wait for grecaptcha to be ready
    await new Promise<void>((resolve) => {
      window.grecaptcha!.ready(() => {
        logger.info('[reCAPTCHA] grecaptcha ready');
        resolve();
      });
    });
  } else {
    logger.info('[reCAPTCHA] grecaptcha already available');
  }

  try {
    logger.info('[reCAPTCHA] Calling grecaptcha.execute...');

    const token = await window.grecaptcha!.execute(env.recaptchaSiteKey, { action });

    logger.info('[reCAPTCHA] Token generated successfully', { action, tokenLength: token.length });
    return token;
  } catch (error) {
    logger.error('[reCAPTCHA] Failed to execute', { action, error });
    throw new Error('Failed to execute reCAPTCHA');
  }
}

/**
 * Check if reCAPTCHA script is loaded
 * 
 * @returns true if script is loaded
 */
export function isRecaptchaLoaded(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return !!window.grecaptcha && !!document.getElementById(RECAPTCHA_SCRIPT_ID);
}



