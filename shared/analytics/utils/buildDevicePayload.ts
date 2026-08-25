/**
 * Device Payload Builder
 * 
 * Extracts device information from browser
 */

import { ANALYTICS_STORAGE_KEYS } from '../constants/analytics.constants';
import type { DeviceContext } from '../model/context.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get or create device ID
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  const stored = localStorage.getItem(ANALYTICS_STORAGE_KEYS.DEVICE_ID);
  if (stored) return stored;
  
  const newId = uuidv4();
  localStorage.setItem(ANALYTICS_STORAGE_KEYS.DEVICE_ID, newId);
  return newId;
}

/**
 * Parse user agent to extract browser and OS info
 */
function parseUserAgent(): {
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
} {
  if (typeof window === 'undefined') {
    return {
      browser: 'unknown',
      browser_version: 'unknown',
      os: 'unknown',
      os_version: 'unknown',
    };
  }
  
  const ua = navigator.userAgent;
  
  // Browser detection
  let browser = 'unknown';
  let browser_version = 'unknown';
  
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
    const match = ua.match(/Chrome\/(\d+\.\d+)/);
    if (match) browser_version = match[1];
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
    const match = ua.match(/Version\/(\d+\.\d+)/);
    if (match) browser_version = match[1];
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
    const match = ua.match(/Firefox\/(\d+\.\d+)/);
    if (match) browser_version = match[1];
  } else if (ua.includes('Edg')) {
    browser = 'Edge';
    const match = ua.match(/Edg\/(\d+\.\d+)/);
    if (match) browser_version = match[1];
  }
  
  // OS detection
  let os = 'unknown';
  let os_version = 'unknown';
  
  if (ua.includes('Windows')) {
    os = 'Windows';
    if (ua.includes('Windows NT 10.0')) os_version = '10';
    else if (ua.includes('Windows NT 6.3')) os_version = '8.1';
    else if (ua.includes('Windows NT 6.2')) os_version = '8';
    else if (ua.includes('Windows NT 6.1')) os_version = '7';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    if (match) os_version = match[1].replace('_', '.');
  } else if (ua.includes('Android')) {
    os = 'Android';
    const match = ua.match(/Android (\d+\.\d+)/);
    if (match) os_version = match[1];
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
    const match = ua.match(/OS (\d+[._]\d+)/);
    if (match) os_version = match[1].replace('_', '.');
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }
  
  return { browser, browser_version, os, os_version };
}

/**
 * Build device context payload
 */
export function buildDevicePayload(): DeviceContext {
  if (typeof window === 'undefined') {
    return {
      device_id: '',
      device_type: 'server',
      browser: 'unknown',
      browser_version: 'unknown',
      os: 'unknown',
      os_version: 'unknown',
      screen_width: 0,
      screen_height: 0,
      viewport_width: 0,
      viewport_height: 0,
      timezone: 'UTC',
      language: 'en',
    };
  }
  
  const { browser, browser_version, os, os_version } = parseUserAgent();
  
  return {
    device_id: getDeviceId(),
    device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
    browser,
    browser_version,
    os,
    os_version,
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}
