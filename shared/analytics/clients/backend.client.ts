import { LoginIdentifierType } from "@/enums/ui.enum";
import { useAuthStore } from "@/store/useAuthStore";
import { useLocaleStore } from "@/store/useLocaleStore";
import { logger } from "@lib/logger/logger";
import { EVENT_NAMES } from '../constants/analytics.constants';
import { mapAnalyticsAssetCategory } from '../utils/mapAnalyticsAssetCategory';
import type { AnalyticsEvent } from '../model/common.types';
import { useProfileStore } from "@/store/useProfileStore";
import { getSourceLink } from "../utils/getSourceLink";
import { appConfig, isConfigLoaded, getAppConfig } from "@/lib/config/app.config";

class BackendClient {
  private isEnabled = true;

  initialize(): void {
    logger.info("Backend Analytics Client initialized");
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private postEvent(endpointPath: string, payload: Record<string, unknown>, eventName: string): void {
    const storeState = useAuthStore.getState();
    const sessionId = storeState.token || "";
    const locale = useLocaleStore.getState().locale || "1";
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "2.0.0";

    const bffAnalyticsEndpoint = endpointPath.startsWith('/')
      ? `/api${endpointPath}`
      : `/api/${endpointPath}`;

    let actualTargetUrl = bffAnalyticsEndpoint;
    try {
      if (isConfigLoaded()) {
        const base = getAppConfig().analyticUrl;
        if (base) {
          actualTargetUrl = `${base.replace(/\/$/, "")}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;
        }
      }
    } catch (e) {
      // Ignore config load errors during initial render
    }

    logger.info(`[Backend Analytics] Sending event ${eventName}`, { targetUrl: actualTargetUrl, payload });

    fetch(bffAnalyticsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "deviceTypeCode": "3",
        "appversion": appVersion,
        "project": "JOJO",
        "language": locale,
        ...(sessionId ? { sessionid: sessionId } : {})
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      logger.error(`[Backend Analytics] Failed to send ${eventName} event: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  trackEvent(event: AnalyticsEvent): void {
    if (typeof window === 'undefined' || !this.isEnabled) return;

    if (event.name === 'login' || event.name === 'login_success') {
      logger.info(`[Backend Analytics] Ignored deprecated event ${event.name}`);
      return;
    }

    try {
      const storeState = useAuthStore.getState();
      const sessionId = storeState.token || "";
      const userId = storeState.user?.id != null ? String(storeState.user.id) : "";
      const profileId = useProfileStore.getState().selectedProfile?.profile_id || "";
      const locale = useLocaleStore.getState().locale || "1";
      const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "2.0.5";

      // Case: CONTENT_CLICKED
      if (event.name === EVENT_NAMES.CONTENT_CLICKED) {
        const properties = event.properties || {};

        const rawAssetId = properties.asset_id ?? properties.content_id ?? properties.id;
        const parsedAssetId = rawAssetId !== undefined ? (isNaN(Number(rawAssetId)) ? String(rawAssetId) : Number(rawAssetId)) : undefined;

        const rawRailId = properties.content_rail_id ?? properties.rail_id;
        const parsedRailId = rawRailId !== undefined ? (isNaN(Number(rawRailId)) ? String(rawRailId) : Number(rawRailId)) : undefined;

        const inTop10 = properties.in_top_10 !== undefined ? Boolean(properties.in_top_10) : (properties.is_top_10 !== undefined ? Boolean(properties.is_top_10) : false);

        const rawNumberInTop10 = properties.number_in_top_10 ?? properties.item_position;
        const numberInTop10 = rawNumberInTop10 !== undefined ? Number(rawNumberInTop10) : undefined;

        const payload: Record<string, any> = {
          asset_category: mapAnalyticsAssetCategory(properties.asset_category) || "svod",
          in_top_10: inTop10,
          content_rail_name: properties.content_rail_name || properties.rail_name || "",
          ...(numberInTop10 !== undefined ? { number_in_top_10: numberInTop10 } : {}),
          ...(parsedRailId !== undefined ? { content_rail_id: parsedRailId } : {}),
          asset_type: (properties.asset_type || properties.content_type || "movie").toLowerCase(),
          content_rail_display_type: properties.content_rail_display_type || properties.rail_display_type || "main carousel",
          asset_name: properties.asset_name || properties.asset_title || properties.title || "",
          ...(parsedAssetId !== undefined ? { asset_id: parsedAssetId } : {}),
        };

        // Include any genre_* and tag_* properties
        Object.keys(properties).forEach((key) => {
          if (key.startsWith("genre_") || key.startsWith("tag_")) {
            payload[key] = properties[key];
          }
        });

        const backendPayloadObject = {
          timestamp: Number((Date.now() / 1000).toFixed(5)),
          profile_id: profileId,
          payload,
          user_id: userId,
          sessionid: sessionId,
          appVersion: appVersion,
          deviceTypeCode: "2",
          language: locale,
          event: EVENT_NAMES.CONTENT_CLICKED,
          consumedAt: new Date().toISOString(),
        };

        this.postEvent(`/v1/jojoevents/${EVENT_NAMES.CONTENT_CLICKED}`, backendPayloadObject, event.name);
        return;
      }

      // Case: PLAYBACK_STARTED
      if (event.name === EVENT_NAMES.PLAYBACK_STARTED) {
        const properties = event.properties || {};

        const rawAssetId = properties.asset_id ?? properties.content_id ?? properties.id;
        const parsedAssetId = rawAssetId !== undefined && rawAssetId !== null
          ? (isNaN(Number(rawAssetId)) ? String(rawAssetId) : Number(rawAssetId))
          : null;

        const inTop10 = properties.in_top_10 !== undefined
          ? Boolean(properties.in_top_10)
          : (properties.is_top_10 !== undefined ? Boolean(properties.is_top_10) : false);

        const rawNumberInTop10 = properties.number_in_top_10;
        const numberInTop10 = rawNumberInTop10 !== undefined && rawNumberInTop10 !== null
          ? Number(rawNumberInTop10)
          : null;

        const rawSeasonId = properties.season_id;
        const seasonId = rawSeasonId !== undefined && rawSeasonId !== null
          ? (isNaN(Number(rawSeasonId)) ? String(rawSeasonId) : Number(rawSeasonId))
          : null;

        const payload: Record<string, any> = {
          custom_platform: appConfig.CUSTOME_PLATFORM_EVENT_NAME,
          version: properties.version || appVersion,
          asset_id: parsedAssetId,
          asset_name: properties.asset_name || properties.asset_title || properties.title || "",
          asset_category: mapAnalyticsAssetCategory(properties.asset_category) || "avod",
          asset_certificate: properties.asset_certificate || properties.certification || null,
          in_top_10: inTop10,
          season_id: seasonId,
          number_in_top_10: numberInTop10,
          asset_type: (properties.asset_type || properties.content_type || "movie").toLowerCase(),
        };

        const backendPayloadObject = {
          timestamp: Number((Date.now() / 1000).toFixed(5)),
          profile_id: profileId,
          payload,
          sessionid: sessionId,
          user_id: userId,
          appVersion: appVersion,
          deviceTypeCode: "2",
          language: locale,
          event: EVENT_NAMES.PLAYBACK_STARTED,
          consumedAt: new Date().toISOString(),
        };

        this.postEvent(`/v1/jojoevents/${EVENT_NAMES.PLAYBACK_STARTED}`, backendPayloadObject, event.name);
        return;
      }

      // Case: PLAYBACK_END
      if (event.name === EVENT_NAMES.PLAYBACK_END) {
        const properties = event.properties || {};

        const rawAssetId = properties.asset_id ?? properties.content_id ?? properties.id;
        const parsedAssetId = rawAssetId !== undefined && rawAssetId !== null
          ? (isNaN(Number(rawAssetId)) ? String(rawAssetId) : Number(rawAssetId))
          : null;

        const payload: Record<string, any> = {
          asset_id: parsedAssetId,
          position_seconds: properties.position_seconds,
          total_duration_seconds: properties.total_duration_seconds,
        };

        const backendPayloadObject = {
          timestamp: Number((Date.now() / 1000).toFixed(5)),
          profile_id: profileId,
          payload,
          sessionid: sessionId,
          user_id: userId,
          appVersion: appVersion,
          deviceTypeCode: "2",
          language: locale,
          event: EVENT_NAMES.PLAYBACK_END,
          consumedAt: new Date().toISOString(),
        };

        this.postEvent(`/v1/jojoevents/${EVENT_NAMES.PLAYBACK_END}`, backendPayloadObject, event.name);
        return;
      }

      // Case 2: login_started
      if (event.name === EVENT_NAMES.LOGIN_STARTED) {
        const properties = event.properties || {};
        const eventSessionId = properties.session_id || sessionId;
        const eventUserId = properties.user_id || userId;
        const sourceLink = getSourceLink(properties.source_link);

        const payloadObject = {
          payload: {
            method: properties.method,
            ...(properties.method === LoginIdentifierType.PHONE && properties.value ? { phone_number: properties.value } : {}),
            ...(properties.method === LoginIdentifierType.EMAIL && properties.value ? { email: properties.value } : {}),
            source_link: sourceLink,
            user_id: eventUserId,
            session_id: eventSessionId,
            timestamp: Date.now(),
          }
        };
        this.postEvent(`/v1/jojoevents/${EVENT_NAMES.LOGIN_STARTED}`, payloadObject, event.name);
        return;
      }

      // Case 3: login_completed
      if (event.name === EVENT_NAMES.LOGIN_COMPLETED) {
        const properties = event.properties || {};
        const eventSessionId = properties.session_id || sessionId;
        const eventUserId = properties.user_id || userId;
        const sourceLink = getSourceLink(properties.source_link);

        const payloadObject = {
          payload: {
            method: properties.method,
            ...(properties.method === LoginIdentifierType.PHONE && properties.value ? {
              phone_number: properties.phoneOnly || "",
              phone_code: properties.phoneCode || ""
            } : {}),
            ...(properties.method === LoginIdentifierType.EMAIL && properties.value ? { email: properties.value } : {}),
            ...(properties.otp ? { otp: properties.otp } : {}),
            source_link: sourceLink,
            user_id: eventUserId,
            session_id: eventSessionId,
            timestamp: Date.now(),
          }
        };
        this.postEvent(`/v1/jojoevents/${EVENT_NAMES.LOGIN_COMPLETED}`, payloadObject, event.name);
        return;
      }

      // Case 4: WEB_BFF_IP_TRACKING event
      if (event.name === EVENT_NAMES.WEB_BFF_IP_TRACKING) {
        const payloadObject = {
          event: EVENT_NAMES.WEB_BFF_IP_TRACKING,
          properties: {
            ...event.properties,
            user_id: userId,
            profile_id: profileId,
            session_id: sessionId,
            app_version: appVersion,
            timestamp: Number((Date.now() / 1000).toFixed(5)),
          },
        };
        this.postEvent(`/v1/jojoevents/${EVENT_NAMES.WEB_BFF_IP_TRACKING}`, payloadObject, event.name);
        return;
      }

      // Case 5: Generic/Custom events
      const payloadObject = {
        event: event.name,
        properties: {
          ...event.properties,
          self_link: event.context?.self_link || (typeof window !== 'undefined' ? window.location.href : "https://jojoapp.in"),
          timestamp: new Date().toISOString(),
        },
      };
      this.postEvent(`/v1/jojoevents/${event.name}`, payloadObject, event.name);

    } catch (err) {
      logger.error(`[Backend Analytics] Error sending event: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

export const backendClient = new BackendClient();
