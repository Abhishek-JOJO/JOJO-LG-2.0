import assert from "node:assert/strict";
import test from "node:test";

import { isTizenWebSimulatorPath } from "./detectPlatform";

test("detects Samsung TV Web Simulator application paths", () => {
  assert.equal(
    isTizenWebSimulatorPath(
      "/Users/test/tizen-studio/tools/sec-tv-simulator/appLauncher/app/J0J0TV2026/index.html",
    ),
    true,
  );
  assert.equal(
    isTizenWebSimulatorPath(
      "/Users/test/tizen-studio/tools/sec-tv-simulator/appLauncher/app/J0J0TV2026/login/index.html",
    ),
    true,
  );
});

test("does not classify physical Tizen or LG paths as the Web Simulator", () => {
  assert.equal(
    isTizenWebSimulatorPath(
      "/opt/usr/home/owner/apps_rw/J0J0TV2026/res/wgt/index.html",
    ),
    false,
  );
  assert.equal(
    isTizenWebSimulatorPath(
      "/media/developer/apps/usr/palm/applications/in.jojoapp.jojo/index.html",
    ),
    false,
  );
});
