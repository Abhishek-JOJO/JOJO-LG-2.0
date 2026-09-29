import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const projectDir = path.resolve("dist/tizen");
const outputDir = path.resolve("dist");
const certificateProfile = process.env.TIZEN_CERT_PROFILE;

if (!fs.existsSync(path.join(projectDir, "config.xml"))) {
  console.error("Missing dist/tizen/config.xml. Run a Tizen build first.");
  process.exit(1);
}

if (!certificateProfile) {
  console.error("Set TIZEN_CERT_PROFILE to the signing profile configured in Tizen Studio.");
  process.exit(1);
}

const result = spawnSync(
  "tizen",
  ["package", "-t", "wgt", "-s", certificateProfile, "-o", outputDir, "--", projectDir],
  { stdio: "inherit" },
);

if (result.error) {
  console.error("Unable to run the Tizen CLI:", result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
