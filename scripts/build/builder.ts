import { execSync } from 'child_process';
import { fixWebOSPaths } from './fix-webos-paths';
import { stagePlatformBuild, type BuildPlatform } from './stage-platform';

/**
 * Run Next.js build with environment variables
 * Loads the appropriate .env file based on environment
 */
export function runBuild(
  env: string,
  version: string,
  loggerAllowed: boolean,
  consoleAllowed: boolean,
  platform: BuildPlatform,
): void {

  // Map environment to env file
  const envFileMap: Record<string, string> = {
    dev: '.env.development',
    stage: '.env.stage',
    prod: '.env.production',
  };

  const envFile = envFileMap[env] || '.env.development';

  try {
    execSync(`npx dotenv -e ${envFile} -- npx next build`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // Keep NODE_ENV as production for all builds (required for Next.js optimization)
        // But don't override other NEXT_PUBLIC_ vars from the loaded env file
        NEXT_PUBLIC_APP_ENV: env,
        NEXT_PUBLIC_APP_VERSION: version,
        NEXT_PUBLIC_TV_PLATFORM: platform,
        NEXT_PUBLIC_ENABLE_API_LOGS: String(loggerAllowed),
        VITE_APP_ENV: env, // Backward compatibility if needed
        VITE_APP_VERSION: version,
        VITE_LOGGER_ENABLED: String(loggerAllowed),
        VITE_CONSOLE_ENABLED: String(consoleAllowed),
      },
    });

    // Both packaged TV targets run the exported app from file://. Next emits
    // root-relative asset URLs by default, so apply the existing file-protocol
    // rewrite before staging either platform package.
    fixWebOSPaths();
    stagePlatformBuild(platform, version);
  } catch {
    process.exit(1);
  }
}
