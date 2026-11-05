import assert from "node:assert/strict";
import test from "node:test";

import type { DevicesConfig } from "@/lib/config/app.config";
import { evaluateAppUpdate } from "./useTVUpdateCheck";

const config = (appVersion: object) => ({ platform: { appVersion } }) as unknown as DevicesConfig;
const live = config({ minimum: "99.0.0", latest: "99.0.0", forceUpdate: false, updateUrl: "" });

test("Samsung ignores the backend's version numbers", () => {
  const result = evaluateAppUpdate(live, false);
  assert.equal(result.hasUpdate, false);
  assert.equal(result.isForceUpdate, false);
});

test("Samsung still obeys explicit update flags", () => {
  const soft = evaluateAppUpdate(config({ latest: "99.0.0", isUpdateAvailable: true }), false);
  assert.deepEqual([soft.hasUpdate, soft.isForceUpdate], [true, false]);
  const forced = evaluateAppUpdate(config({ isUpdateAvailable: true, isForceUpdateAvailable: true }), false);
  assert.deepEqual([forced.hasUpdate, forced.isForceUpdate], [true, true]);
});

test("other platforms keep comparing version numbers", () => {
  const result = evaluateAppUpdate(live, true);
  assert.deepEqual([result.hasUpdate, result.isForceUpdate], [true, true]);
});
