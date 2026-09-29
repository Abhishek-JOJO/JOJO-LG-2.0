import assert from "node:assert/strict";
import test from "node:test";
import type { TizenTVInputDevice } from "../types";
import { registerTizenKeys } from "./registerTizenKeys";
import { TIZEN_OPTIONAL_KEY_NAMES } from "./tizenKeys";

test("does nothing when the Tizen input API is absent", () => {
  const cleanup = registerTizenKeys(undefined);
  assert.doesNotThrow(cleanup);
});

test("registers once for multiple consumers and unregisters after final cleanup", () => {
  let registerCalls = 0;
  let unregisterCalls = 0;
  const device: TizenTVInputDevice = {
    registerKey: () => undefined,
    registerKeyBatch: (keys) => {
      registerCalls += 1;
      assert.deepEqual(keys, [...TIZEN_OPTIONAL_KEY_NAMES]);
    },
    unregisterKeyBatch: (keys) => {
      unregisterCalls += 1;
      assert.deepEqual(keys, [...TIZEN_OPTIONAL_KEY_NAMES]);
    },
  };

  const cleanupOne = registerTizenKeys(device);
  const cleanupTwo = registerTizenKeys(device);
  assert.equal(registerCalls, 1);

  cleanupOne();
  assert.equal(unregisterCalls, 0);
  cleanupTwo();
  assert.equal(unregisterCalls, 1);
});
