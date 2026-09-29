import type { TVDeviceInfo, TVPlatformAdapter } from "../types";

export class WebOSAdapter implements TVPlatformAdapter {
  readonly name = "webos" as const;

  initialize(): void {}

  destroy(): void {}

  exitOrDeactivateApp(): void {
    if (typeof window === "undefined") return;
    try {
      if (window.PalmSystem?.deactivate) window.PalmSystem.deactivate();
      else if (window.PalmSystem?.platformBack) window.PalmSystem.platformBack();
      else if (window.PalmSystem?.close) window.PalmSystem.close();
      else window.webOS?.platformBack?.();
    } catch (error) {
      console.warn("[webOS] Failed to deactivate application", error);
    }
  }

  async getDeviceInfo(): Promise<TVDeviceInfo> {
    if (typeof window === "undefined") return { platform: this.name };
    try {
      const raw = window.PalmSystem?.deviceInfo;
      return { platform: this.name, raw };
    } catch {
      return { platform: this.name };
    }
  }

  openAppStorePage(appId: string, customUrl?: string): void {
    if (typeof window === "undefined") return;
    if (customUrl?.startsWith("http://") || customUrl?.startsWith("https://")) {
      window.open(customUrl, "_blank");
      return;
    }

    if (window.webOS?.service) {
      try {
        window.webOS.service.request("luna://com.webos.applicationManager", {
          method: "launch",
          parameters: {
            id: "com.webos.app.discovery",
            params: { category: "APPSPODS", id: appId },
          },
          onFailure: () => {
            window.location.href = customUrl || `https://in.lgappstv.com/main/tvapp/detail?appId=${appId}`;
          },
        });
        return;
      } catch (error) {
        console.warn("[webOS] Failed to launch LG Content Store", error);
      }
    }

    window.open(customUrl || `https://in.lgappstv.com/main/tvapp/detail?appId=${appId}`, "_blank");
  }

  supportsPointer(): boolean {
    return true;
  }
}
