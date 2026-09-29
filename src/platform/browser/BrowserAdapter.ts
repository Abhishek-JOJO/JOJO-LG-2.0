import type { TVDeviceInfo, TVPlatformAdapter } from "../types";

export class BrowserAdapter implements TVPlatformAdapter {
  readonly name = "browser" as const;

  initialize(): void {}

  destroy(): void {}

  exitOrDeactivateApp(): void {
    console.info("[Browser] TV application exit simulated");
  }

  async getDeviceInfo(): Promise<TVDeviceInfo> {
    return { platform: this.name };
  }

  openAppStorePage(_appId: string, customUrl?: string): void {
    if (customUrl && typeof window !== "undefined") window.open(customUrl, "_blank");
  }

  supportsPointer(): boolean {
    return true;
  }
}
