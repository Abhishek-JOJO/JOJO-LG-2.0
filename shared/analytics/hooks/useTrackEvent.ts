/**
 * useTrackEvent Hook
 *
 * For tracking UI interactions from components
 *
 * USAGE:
 * const trackEvent = useTrackEvent();
 *
 * trackEvent.navigationClicked({ destination: 'home' });
 */

'use client';

import { useCallback } from 'react';
import { analyticsService } from '../services/analytics.service';

export function useTrackEvent() {

  const trackContentClicked = useCallback(
    (data: Parameters<typeof analyticsService.trackContentClicked>[0]) => {
      analyticsService.trackContentClicked(data);
    },
    []
  );

  return {
    contentClicked: trackContentClicked,
  };
}
