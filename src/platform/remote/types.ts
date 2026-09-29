export type RemoteAction =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "ENTER"
  | "BACK"
  | "PLAY"
  | "PAUSE"
  | "PLAY_PAUSE"
  | "STOP"
  | "FAST_FORWARD"
  | "REWIND"
  | "CHANNEL_UP"
  | "CHANNEL_DOWN"
  | "PAGE_UP"
  | "PAGE_DOWN"
  | "RED"
  | "GREEN"
  | "YELLOW"
  | "BLUE"
  | "INFO"
  | "UNKNOWN";

export type RemoteKeyboardEvent = Pick<KeyboardEvent, "key" | "keyCode" | "target">;

