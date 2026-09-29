export type TVPlatform = "webos" | "tizen" | "browser";

export interface TVDeviceInfo {
  platform: TVPlatform;
  modelName?: string;
  firmwareVersion?: string;
  raw?: unknown;
}

export interface TVPlatformAdapter {
  readonly name: TVPlatform;
  initialize(): void;
  destroy(): void;
  exitOrDeactivateApp(): void;
  getDeviceInfo(): Promise<TVDeviceInfo>;
  openAppStorePage(appId: string, customUrl?: string): void;
  supportsPointer(): boolean;
}

export interface TizenErrorLike {
  name?: string;
  message?: string;
}

export interface TizenTVInputDevice {
  registerKey(keyName: string): void;
  unregisterKey?(keyName: string): void;
  registerKeyBatch?(
    keyNames: string[],
    successCallback?: () => void,
    errorCallback?: (error: TizenErrorLike) => void,
  ): void;
  unregisterKeyBatch?(
    keyNames: string[],
    successCallback?: () => void,
    errorCallback?: (error: TizenErrorLike) => void,
  ): void;
}

export type TizenApplicationControlInstance = object;

export interface TizenApplicationControlConstructor {
  new (operation: string, uri?: string): TizenApplicationControlInstance;
}

export interface TizenApplicationManager {
  getCurrentApplication(): { exit(): void };
  launchAppControl?(
    control: TizenApplicationControlInstance,
    applicationId?: string | null,
    successCallback?: () => void,
    errorCallback?: (error: TizenErrorLike) => void,
  ): void;
}

export interface TizenAPI {
  tvinputdevice?: TizenTVInputDevice;
  application?: TizenApplicationManager;
  ApplicationControl?: TizenApplicationControlConstructor;
}

declare global {
  interface Window {
    tizen?: TizenAPI;
    webOS?: {
      platformBack?: () => void;
      deviceInfo?: (callback: (info: Record<string, unknown>) => void) => void;
      fetchAppId?: () => string;
      service?: {
        request: (
          uri: string,
          options: {
            method: string;
            parameters?: Record<string, unknown>;
            onSuccess?: (result?: unknown) => void;
            onFailure?: (error: unknown) => void;
          },
        ) => void;
      };
    };
    PalmSystem?: {
      deviceInfo?: string;
      platformBack?: () => void;
      close?: () => void;
      deactivate?: () => void;
    };
    __WEBOS_APP_BASE__?: string;
  }
}
