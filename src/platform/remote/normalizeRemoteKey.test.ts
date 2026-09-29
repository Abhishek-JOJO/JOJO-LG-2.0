import assert from "node:assert/strict";
import test from "node:test";
import { getRemoteAction, isBackEvent, shouldHandleRemoteEvent } from "./normalizeRemoteKey";

const keyEvent = (key: string, keyCode: number) => ({ key, keyCode, target: null });

test("normalizes LG, Samsung and browser Back keys", () => {
  assert.equal(getRemoteAction(keyEvent("Unidentified", 461)), "BACK");
  assert.equal(getRemoteAction(keyEvent("Unidentified", 10009)), "BACK");
  assert.equal(getRemoteAction(keyEvent("Escape", 27)), "BACK");
  assert.equal(isBackEvent(keyEvent("GoBack", 0)), true);
});

test("normalizes LG and Samsung media keys", () => {
  assert.equal(getRemoteAction(keyEvent("Unidentified", 415)), "PLAY");
  assert.equal(getRemoteAction(keyEvent("MediaPlay", 0)), "PLAY");
  assert.equal(getRemoteAction(keyEvent("Unidentified", 19)), "PAUSE");
  assert.equal(getRemoteAction(keyEvent("MediaPlayPause", 10252)), "PLAY_PAUSE");
  assert.equal(getRemoteAction(keyEvent("Unidentified", 417)), "FAST_FORWARD");
  assert.equal(getRemoteAction(keyEvent("Unidentified", 412)), "REWIND");
});

test("unknown keys do not become navigation actions", () => {
  assert.equal(getRemoteAction(keyEvent("F24", 135)), "UNKNOWN");
});

test("globally handled events must not already be prevented", () => {
  assert.equal(shouldHandleRemoteEvent({ defaultPrevented: false }), true);
  assert.equal(shouldHandleRemoteEvent({ defaultPrevented: true }), false);
});
