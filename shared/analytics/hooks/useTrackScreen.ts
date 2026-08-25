/**
 * useTrackScreen Hook
 *
 * For manual page/screen tracking
 *
 * USAGE:
 * const trackScreen = useTrackScreen();
 *
 * useEffect(() => {
 *   trackScreen('Modal Name', '/modal-path');
 * }, []);
 */

'use client';

import { useCallback } from 'react';
import { analyticsService } from '../services/analytics.service';

export function useTrackScreen() {
  const trackScreen = useCallback((screenName: string, screenPath: string) => {
    analyticsService.trackPageView({
      page: screenName,
      page_title: screenName,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
  }, []);

  return trackScreen;
}
