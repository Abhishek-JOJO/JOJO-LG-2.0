/**
 * Context Types
 * 
 * Auto-injected context for all analytics events
 */

/**
 * Session context (auto-injected into all events)
 */
export interface SessionContext {
  session_id: string;
  session_start_time: string;
  session_duration_seconds?: number;
}

/**
 * Profile context (auto-injected when profile selected)
 */
export interface ProfileContext {
  profile_id: string;
  profile_name: string;
  is_kid: boolean;
}

/**
 * Device context (auto-injected into all events)
 */
export interface DeviceContext {
  device_id: string;
  device_type: string;
  browser: string;
  browser_version: string;
  os: string;
  os_version: string;
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
  timezone: string;
  language: string;
}

/**
 * Geo context (optional, backend-assisted)
 * 
 * NOTE: Geo tracking is optional and requires backend integration.
 * This context is only populated if geo data is available from your backend.
 */
export interface GeoContext {
  country_code?: string;
  country_name?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  ip_address?: string;
}

/**
 * User context (auto-injected when authenticated)
 */
export interface UserContext {
  user_id: string;
  phone?: string;
  email?: string;
  is_guest: boolean;
  created_at: string;
}

/**
 * Complete event context (merged from all sources)
 */
// export interface EventContext {
//   session?: SessionContext;
//   profile?: ProfileContext;
//   device: DeviceContext;
//   geo?: GeoContext;
//   user?: UserContext;
//   timestamp: string;
//   environment: 'development' | 'production';
// }

export interface EventContext {
  session?: SessionContext;
  device: DeviceContext;
  user?: UserContext;
  timestamp: string;
  environment: 'development' | 'production';
  self_link?: string;
  suffix?: string;
}
