import { appConfig } from "@/lib/config/app.config";
import { logger } from "@lib/logger/logger";

export type AnalyticsEvent =
  | "video_play"
  | "video_pause"
  | "video_complete"
  | "video_seek"
  | "login"
  | "logout"
  | "page_view";

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!appConfig.flags.enableAnalytics) return;

  logger.info(`[Analytics] ${event}`, properties);

  // TODO: Replace with your real analytics provider (Segment, Mixpanel, etc.)
  // window.analytics?.track(event, properties);
}
