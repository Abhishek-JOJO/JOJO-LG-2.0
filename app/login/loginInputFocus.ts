import { setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { isTizen } from "@/src/platform/detectPlatform";

export const LOGIN_INPUT_FIELD_ID = "login-input-field";

// Keys the Samsung on-screen keyboard (IME) sends to the page when it closes.
export const TIZEN_IME_DONE_KEY_CODE = 65376;
export const TIZEN_IME_CANCEL_KEY_CODE = 65385;

/**
 * Samsung TVs type into the login field with the TV's own on-screen keyboard
 * instead of the app's custom one (TvKeyboard).
 */
export function usesNativeLoginKeyboard(): boolean {
  return isTizen();
}

/**
 * DOM-focuses the login <input> with the caret at the end. On Samsung this is
 * what opens the TV keyboard.
 */
export function placeCaretInLoginInput(): void {
  const el = document.getElementById(LOGIN_INPUT_FIELD_ID) as HTMLInputElement | null;
  if (!el) return;
  el.focus();
  const len = el.value.length;
  el.setSelectionRange(len, len);
}

/**
 * Moves remote focus onto the login field. With the custom keyboard the
 * <input> is focused too, so its keys type into it. On Samsung the TV
 * keyboard opens whenever the <input> gets DOM focus, so arriving on the
 * field only highlights it — the keyboard opens when the user presses OK.
 */
export function focusLoginInput(): void {
  setFocus("login-input");
  if (!usesNativeLoginKeyboard()) placeCaretInLoginInput();
}
