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
 * Update version in package.json and package-lock.json
 */
export function updatePackageVersion(version: string): void {
  const cleanVersion = version.startsWith('v') ? version.slice(1) : version;

  // 1. Update package.json
  const pkgPath = path.resolve('package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.version !== cleanVersion) {
      pkg.version = cleanVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      console.log(`[INFO] Updated package.json version to ${cleanVersion}`);
    }
  }

  // 2. Update package-lock.json
  const lockPath = path.resolve('package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
    let modified = false;
    if (lock.version !== cleanVersion) {
      lock.version = cleanVersion;
      modified = true;
    }
    if (lock.packages && lock.packages[''] && lock.packages[''].version !== cleanVersion) {
      lock.packages[''].version = cleanVersion;
      modified = true;
    }
    if (modified) {
      fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf-8');
      console.log(`[INFO] Updated package-lock.json version to ${cleanVersion}`);
    }
  }
}

