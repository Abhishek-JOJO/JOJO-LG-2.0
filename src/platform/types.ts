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
  tvaudiocontrol?: {
    getVolume(): number;
    setVolume(volume: number): void;
    isMute(): boolean;
    setMute(mute: boolean): void;
  };
}

export type SamsungAVPlayState = 'NONE' | 'IDLE' | 'READY' | 'PLAYING' | 'PAUSED';
export type SamsungAVPlayTrackType = 'VIDEO' | 'AUDIO' | 'TEXT';

export interface SamsungAVPlayTrack {
  type: SamsungAVPlayTrackType;
  index: number;
  extra_info?: string;
}

export interface SamsungAVPlayListener {
  onbufferingstart?(): void;
  onbufferingprogress?(percent: number): void;
  onbufferingcomplete?(): void;
  oncurrentplaytime?(milliseconds: number): void;
  onevent?(eventType: string, eventData: string): void;
  onstreamcompleted?(): void;
  onerror?(eventType: string): void;
  onerrormsg?(eventType: string, errorMessage: string): void;
  onsubtitlechange?(duration: number, text: string, data3?: unknown, data4?: unknown): void;
  ondrmevent?(drmEvent: string, drmData: Record<string, unknown>): void;
}

export interface SamsungAVPlay {
  open(url: string): void;
  close(): void;
  prepareAsync(successCallback: () => void, errorCallback: (error: unknown) => void): void;
  play(): void;
  pause(): void;
  stop(): void;
  seekTo(milliseconds: number, successCallback?: () => void, errorCallback?: (error: unknown) => void): void;
  jumpForward(milliseconds: number, successCallback?: () => void, errorCallback?: (error: unknown) => void): void;
  jumpBackward(milliseconds: number, successCallback?: () => void, errorCallback?: (error: unknown) => void): void;
  getState(): SamsungAVPlayState;
  getCurrentTime(): number;
  getDuration(): number;
  getTotalTrackInfo(): SamsungAVPlayTrack[];
  getCurrentStreamInfo?(): SamsungAVPlayTrack[];
  setListener(listener: SamsungAVPlayListener): void;
  setDisplayRect(x: number, y: number, width: number, height: number): void;
  setDisplayMethod(method: 'PLAYER_DISPLAY_MODE_FULL_SCREEN' | 'PLAYER_DISPLAY_MODE_LETTER_BOX' | 'PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO'): void;
  setSelectTrack(type: SamsungAVPlayTrackType, index: number): void;
  setSilentSubtitle?(silent: boolean): void;
  setSpeed?(speed: number): void;
  setStreamingProperty?(property: string, value: string): void;
  getStreamingProperty?(property: string): string;
  setDrm?(drmType: string, drmOperation: string, jsonParam: string): void;
}

declare global {
  interface Window {
    tizen?: TizenAPI;
    webapis?: {
      avplay?: SamsungAVPlay;
    };
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
