import assert from "node:assert/strict";
import test from "node:test";

import { normalizePathname } from "../../../lib/utils/pathname";

test("normalizes regular web routes", () => {
  assert.equal(normalizePathname("/"), "/");
  assert.equal(normalizePathname("/login/"), "/login");
  assert.equal(normalizePathname("/login/index.html"), "/login");
});

test("normalizes LG webOS packaged routes", () => {
  assert.equal(
    normalizePathname(
      "/media/developer/apps/usr/palm/applications/in.jojoapp.jojo/index.html",
    ),
    "/",
  );
  assert.equal(
    normalizePathname(
      "/media/developer/apps/usr/palm/applications/in.jojoapp.jojo/login/index.html",
    ),
    "/login",
  );
});

test("normalizes Samsung TV Web Simulator routes", () => {
  assert.equal(
    normalizePathname(
      "/Users/test/tizen-studio/tools/sec-tv-simulator/appLauncher/app/J0J0TV2026/index.html",
    ),
    "/",
  );
  assert.equal(
    normalizePathname(
      "/Users/test/tizen-studio/tools/sec-tv-simulator/appLauncher/app/J0J0TV2026/login/index.html",
    ),
    "/login",
  );
});

test("normalizes Samsung Tizen device routes", () => {
  assert.equal(
    normalizePathname(
      "/opt/usr/home/owner/apps_rw/J0J0TV2026/res/wgt/login/otp/index.html",
    ),
    "/login/otp",
  );
});

test("normalizes locally staged TV builds", () => {
  assert.equal(normalizePathname("/workspace/out/login/index.html"), "/login");
  assert.equal(
    normalizePathname("/workspace/dist/tizen/watching/index.html"),
    "/watching",
  );
  assert.equal(
    normalizePathname("/workspace/dist/webos/account-settings/index.html"),
    "/account-settings",
  );
});
