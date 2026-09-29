import { TIZEN_KEYS } from "../tizen/tizenKeys";
import { WEBOS_KEYS } from "../webos/webosKeys";
import type { RemoteAction, RemoteKeyboardEvent } from "./types";

const KEY_NAME_ACTIONS: Readonly<Record<string, RemoteAction>> = {
  ArrowUp: "UP",
  Up: "UP",
  ArrowDown: "DOWN",
  Down: "DOWN",
  ArrowLeft: "LEFT",
  Left: "LEFT",
  ArrowRight: "RIGHT",
  Right: "RIGHT",
  Enter: "ENTER",
  OK: "ENTER",
  Escape: "BACK",
  GoBack: "BACK",
  Back: "BACK",
  XF86Back: "BACK",
  MediaPlay: "PLAY",
  MediaPause: "PAUSE",
  MediaPlayPause: "PLAY_PAUSE",
  MediaStop: "STOP",
  MediaFastForward: "FAST_FORWARD",
  MediaRewind: "REWIND",
  MediaTrackNext: "FAST_FORWARD",
  MediaTrackPrevious: "REWIND",
  ChannelUp: "CHANNEL_UP",
  ChannelDown: "CHANNEL_DOWN",
  PageUp: "PAGE_UP",
  PageDown: "PAGE_DOWN",
  Info: "INFO",
  ColorF0Red: "RED",
  ColorF1Green: "GREEN",
  ColorF2Yellow: "YELLOW",
  ColorF3Blue: "BLUE",
};

const KEY_CODE_ACTIONS: Readonly<Record<number, RemoteAction>> = {
  13: "ENTER",
  27: "BACK",
  33: "PAGE_UP",
  34: "PAGE_DOWN",
  37: "LEFT",
  38: "UP",
  39: "RIGHT",
  40: "DOWN",
  [WEBOS_KEYS.BACK]: "BACK",
  [TIZEN_KEYS.BACK]: "BACK",
  [WEBOS_KEYS.PLAY]: "PLAY",
  [WEBOS_KEYS.PAUSE]: "PAUSE",
  [WEBOS_KEYS.STOP]: "STOP",
  [WEBOS_KEYS.FAST_FORWARD]: "FAST_FORWARD",
  [WEBOS_KEYS.REWIND]: "REWIND",
  [TIZEN_KEYS.TRACK_NEXT]: "FAST_FORWARD",
  [TIZEN_KEYS.TRACK_PREV]: "REWIND",
  [TIZEN_KEYS.PLAY_PAUSE]: "PLAY_PAUSE",
  [WEBOS_KEYS.INFO]: "INFO",
  [WEBOS_KEYS.RED]: "RED",
  [WEBOS_KEYS.GREEN]: "GREEN",
  [WEBOS_KEYS.YELLOW]: "YELLOW",
  [WEBOS_KEYS.BLUE]: "BLUE",
  [WEBOS_KEYS.CHANNEL_UP]: "CHANNEL_UP",
  [WEBOS_KEYS.CHANNEL_DOWN]: "CHANNEL_DOWN",
};

export function getRemoteAction(event: RemoteKeyboardEvent): RemoteAction {
  return KEY_NAME_ACTIONS[event.key] ?? KEY_CODE_ACTIONS[event.keyCode] ?? "UNKNOWN";
}

export function isBackEvent(
  event: RemoteKeyboardEvent,
  options: { includeBackspace?: boolean } = {},
): boolean {
  if (getRemoteAction(event) === "BACK") return true;
  if (!options.includeBackspace || event.key !== "Backspace") return false;

  const target = event.target;
  return !(
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA")
  );
}

export function shouldHandleRemoteEvent(event: Pick<KeyboardEvent, "defaultPrevented">): boolean {
  return !event.defaultPrevented;
}
