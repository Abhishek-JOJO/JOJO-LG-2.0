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

    // Copy Tizen Studio / Eclipse project descriptors if present
    for (const projectFile of [".project", ".tproject"]) {
      const srcFile = path.resolve("platforms/tizen", projectFile);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(targetDir, projectFile));
      }
    }

    // Inject $WEBAPIS/webapis/webapis.js into the <head> of every HTML file for Samsung Tizen AVPlay & WebAPIs
    const injectWebApisScript = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          injectWebApisScript(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".html")) {
          let html = fs.readFileSync(fullPath, "utf8");
          if (!html.includes("$WEBAPIS/webapis/webapis.js")) {
            const scriptTag = '<script type="text/javascript" src="$WEBAPIS/webapis/webapis.js"></script>';
            html = html.replace(/<head>/i, `<head>${scriptTag}`);
            fs.writeFileSync(fullPath, html, "utf8");
          }
        }
      }
    };
    injectWebApisScript(targetDir);
  }

  console.log(`[INFO] Staged ${platform} package at ${targetDir}`);
  return targetDir;
}
