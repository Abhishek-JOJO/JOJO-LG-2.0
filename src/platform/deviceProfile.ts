import { detectTVPlatform } from "./detectPlatform";
import type { TVPlatform } from "./types";

export interface TVDeviceProfile {
  deviceTypeCode: string;
  deviceTypeId: number;
  analyticsPlatform: "LGTV" | "SamsungTV" | "Web";
}

/**
 * Backend device identities.
 *
 * Keep these values centralized: the config bootstrap request, regular API
 * requests, sockets, analytics, ads, and subscription APIs must all identify
 * the TV in exactly the same way.
 */
export const TV_DEVICE_PROFILES: Readonly<Record<TVPlatform, TVDeviceProfile>> = {
  webos: {
    deviceTypeCode: "5",
    deviceTypeId: 5,
    analyticsPlatform: "LGTV",
  },
  tizen: {
    deviceTypeCode: "15",
    deviceTypeId: 15,
    analyticsPlatform: "SamsungTV",
  },
  // Preserve the existing web-development API identity until the backend
  // provides a dedicated browser device code.
  browser: {
    deviceTypeCode: "5",
    deviceTypeId: 5,
    analyticsPlatform: "Web",
  },
};

export function getDeviceProfileForPlatform(platform: TVPlatform): TVDeviceProfile {
  return TV_DEVICE_PROFILES[platform];
}

export function getDeviceProfile(): TVDeviceProfile {
  return getDeviceProfileForPlatform(detectTVPlatform());
}

export function getDeviceTypeCode(): string {
  return getDeviceProfile().deviceTypeCode;
}

export function getDeviceTypeId(): number {
  return getDeviceProfile().deviceTypeId;
}
