import { BrowserAdapter } from "./browser/BrowserAdapter";
import { detectTVPlatform, isTizen, isWebOS } from "./detectPlatform";
import { TizenAdapter } from "./tizen/TizenAdapter";
import type { TVPlatform, TVPlatformAdapter } from "./types";
import { WebOSAdapter } from "./webos/WebOSAdapter";

const adapters: Record<TVPlatform, TVPlatformAdapter> = {
  browser: new BrowserAdapter(),
  tizen: new TizenAdapter(),
  webos: new WebOSAdapter(),
};

export function getTVPlatform(): TVPlatform {
  return detectTVPlatform();
}

export function getTVPlatformAdapter(): TVPlatformAdapter {
  return adapters[getTVPlatform()];
}

export function exitTVApp(): void {
  getTVPlatformAdapter().exitOrDeactivateApp();
}

export function openTVAppStore(appId: string, customUrl?: string): void {
  getTVPlatformAdapter().openAppStorePage(appId, customUrl);
}

export { detectTVPlatform, isTizen, isWebOS };
export { getRemoteAction, isBackEvent, shouldHandleRemoteEvent } from "./remote/normalizeRemoteKey";
export type { RemoteAction, RemoteKeyboardEvent } from "./remote/types";
export type { TVDeviceInfo, TVPlatform, TVPlatformAdapter } from "./types";
