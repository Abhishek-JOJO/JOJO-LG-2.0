/**
 * Analytics Module
 * 
 * Single entry point for all analytics functionality
 */

// Service (main API)
export { analyticsService } from './services/analytics.service';

// React integration
export { AnalyticsProvider } from './providers/AnalyticsProvider';
export { useTrackEvent } from './hooks/useTrackEvent';
export { useTrackScreen } from './hooks/useTrackScreen';

// Types (for TypeScript consumers)
export type * from './model';

// Constants (for reference)
export { EVENT_NAMES, PLAYBACK_CONFIG } from './constants/analytics.constants';

// Event builders
export { authEvents } from './events/auth.events';
export { profileEvents } from './events/profile.events';
export { playbackEvents } from './events/playback.events';
export { adEvents } from './events/ad.events';
export { commonEvents } from './events/common.events';
export { contentEvents } from './events/content.events';
export { purchaseEvents } from './events/purchase.events';
export { buildContentClickedProperties } from './utils/buildContentClickedProperties';
export { buildUserSpecificPropertiesPayload } from './utils/buildUserSpecificPropertiesPayload';


