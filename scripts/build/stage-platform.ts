import * as fs from "fs";
import * as path from "path";

export type BuildPlatform = "webos" | "tizen";

export function stagePlatformBuild(platform: BuildPlatform, version: string): string {
  const exportDir = path.resolve("out");
  if (!fs.existsSync(exportDir)) {
    throw new Error("Next.js export directory was not created: out");
  }

  const targetDir = path.resolve("dist", platform);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(exportDir, targetDir, { recursive: true });

  if (platform === "webos") {
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve("platforms/webos/appinfo.json"), "utf8"),
    );
    manifest.version = version;
    fs.writeFileSync(
      path.join(targetDir, "appinfo.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    fs.rmSync(path.join(targetDir, "config.xml"), { force: true });
  } else {
    const sourceConfig = fs.readFileSync(path.resolve("platforms/tizen/config.xml"), "utf8");
    const versionedConfig = sourceConfig.replace(
      /(<widget[\s\S]*?\bversion=")[^"]+("[\s\S]*?>)/,
      `$1${version}$2`,
    );
    fs.writeFileSync(path.join(targetDir, "config.xml"), versionedConfig, "utf8");
    fs.rmSync(path.join(targetDir, "appinfo.json"), { force: true });
    fs.rmSync(path.join(targetDir, "webOSTV.js"), { force: true });
  }

  console.log(`[INFO] Staged ${platform} package at ${targetDir}`);
  return targetDir;
}
