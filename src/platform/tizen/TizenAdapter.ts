import type { TVDeviceInfo, TVPlatformAdapter } from "../types";
import { registerTizenKeys } from "./registerTizenKeys";

export class TizenAdapter implements TVPlatformAdapter {
  readonly name = "tizen" as const;
  private releaseKeys: (() => void) | null = null;

  initialize(): void {
    if (!this.releaseKeys) this.releaseKeys = registerTizenKeys();
  }

  destroy(): void {
    this.releaseKeys?.();
    this.releaseKeys = null;
  }

  exitOrDeactivateApp(): void {
    if (typeof window === "undefined") return;
    try {
      window.tizen?.application?.getCurrentApplication().exit();
    } catch (error) {
      console.warn("[Tizen] Failed to exit application", error);
    }
  }

  async getDeviceInfo(): Promise<TVDeviceInfo> {
    return { platform: this.name };
  }

  openAppStorePage(appId: string, customUrl?: string): void {
    if (typeof window === "undefined") return;
    const url = customUrl || `samsungapps://ProductDetail/${appId}`;
    const tizen = window.tizen;

    if (tizen?.ApplicationControl && tizen.application?.launchAppControl) {
      try {
        const control = new tizen.ApplicationControl(
          "http://tizen.org/appcontrol/operation/view",
          url,
        );
        tizen.application.launchAppControl(control, null, undefined, (error) => {
          console.warn("[Tizen] Failed to launch Samsung Apps", error);
        });
        return;
      } catch (error) {
        console.warn("[Tizen] Failed to create store application control", error);
      }
    }

    if (customUrl?.startsWith("http://") || customUrl?.startsWith("https://")) {
      window.open(customUrl, "_blank");
    }
  }

  supportsPointer(): boolean {
    return false;
  }
}
