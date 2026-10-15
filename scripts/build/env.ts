import * as fs from 'fs';
import * as path from 'path';

/**
 * Load environment variables from .env file
 * Only loads if key doesn't already exist in process.env
 */
export function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Environment file not found: ${filePath}`);
    return;
  }
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim();
    if (key) {
      process.env[key] = val;
    }
  }
}

/**
 * Load environment file based on environment type
 * Priority: .env.{env} > .env
 * Note: .env.local is intentionally skipped for builds
 */
export function loadEnvForBuild(env: string): void {
  const envFileMap: Record<string, string> = {
    dev: '.env.development',
    stage: '.env.stage',
    prod: '.env.production',
  };

  const envFile = envFileMap[env];

  if (envFile) {
    loadEnvFile(path.resolve(envFile));
  }

  // Load base .env as fallback
  loadEnvFile(path.resolve('.env'));
}

/**
 * Get version from package.json
 */
export function getPackageVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
  return pkg.version || '1.0.0';
}

/**
 * Each TV store has an independent release train. Use the target manifest as
 * the default so building Samsung never falls back to the LG/package version.
 */
export function getPlatformVersion(platform: 'webos' | 'tizen'): string {
  if (platform === 'tizen') {
    const configPath = path.resolve('platforms/tizen/config.xml');
    if (fs.existsSync(configPath)) {
      const match = fs.readFileSync(configPath, 'utf-8').match(/<widget[\s\S]*?\bversion="([^"]+)"/);
      if (match?.[1]) return match[1];
    }
  } else {
    const appInfoPath = path.resolve('platforms/webos/appinfo.json');
    if (fs.existsSync(appInfoPath)) {
      const appInfo = JSON.parse(fs.readFileSync(appInfoPath, 'utf-8'));
      if (appInfo.version) return appInfo.version;
    }
  }

  return getPackageVersion();
}

/** Update only the selected platform's install manifest. */
export function updatePlatformVersion(version: string, platform: 'webos' | 'tizen'): void {
  const cleanVersion = version.replace(/^v/i, '');

  if (platform === 'webos') {
    // public/appinfo.json is included in the Next export used by webOS.
    for (const manifestPath of ['public/appinfo.json', 'platforms/webos/appinfo.json']) {
      const appInfoPath = path.resolve(manifestPath);
      if (!fs.existsSync(appInfoPath)) continue;
      const appInfo = JSON.parse(fs.readFileSync(appInfoPath, 'utf-8'));
      if (appInfo.version !== cleanVersion) {
        appInfo.version = cleanVersion;
        fs.writeFileSync(appInfoPath, JSON.stringify(appInfo, null, 2) + '\n', 'utf-8');
        console.log(`[INFO] Updated ${manifestPath} version to ${cleanVersion}`);
      }
    }
    return;
  }

  const tizenConfigPath = path.resolve('platforms/tizen/config.xml');
  if (fs.existsSync(tizenConfigPath)) {
    const config = fs.readFileSync(tizenConfigPath, 'utf-8');
    const updated = config.replace(
      /(<widget[\s\S]*?\bversion=")[^"]+("[\s\S]*?>)/,
      `$1${cleanVersion}$2`,
    );
    if (updated !== config) {
      fs.writeFileSync(tizenConfigPath, updated, 'utf-8');
      console.log(`[INFO] Updated platforms/tizen/config.xml version to ${cleanVersion}`);
    }
  }
}
