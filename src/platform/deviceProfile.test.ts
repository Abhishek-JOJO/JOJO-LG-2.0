import assert from "node:assert/strict";
import test from "node:test";
import { getDeviceProfileForPlatform } from "./deviceProfile";

test("uses the LG backend identity for webOS", () => {
  const profile = getDeviceProfileForPlatform("webos");

  assert.equal(profile.deviceTypeCode, "5");
  assert.equal(profile.deviceTypeId, 5);
  assert.equal(profile.analyticsPlatform, "LGTV");
});

test("uses the Samsung backend identity for Tizen", () => {
  const profile = getDeviceProfileForPlatform("tizen");

  assert.equal(profile.deviceTypeCode, "15");
  assert.equal(profile.deviceTypeId, 15);
  assert.equal(profile.analyticsPlatform, "SamsungTV");
});
