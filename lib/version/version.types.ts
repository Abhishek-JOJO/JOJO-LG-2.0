/**
 * version.types.ts
 *
 * Shared TypeScript types for the frontend version update detection system.
 * Used by /api/version route handler and useVersionCheck hook.
 */

/** Shape returned by the /api/version endpoint. */
export interface VersionResponse {
  /** Git commit SHA, build tag, or timestamp — baked in at build time. */
  version: string;
  /** ISO 8601 timestamp of when the build was produced. */
  buildTime: string;
  /** Deployment environment: "development" | "stage" | "prod" */
  environment: string;
}

/** State exposed by the useVersionCheck hook. */
export interface VersionCheckState {
  /** True when the server reports a version different from the one baked into this bundle. */
  updateAvailable: boolean;
  /** The version string currently running in the browser bundle. */
  currentVersion: string;
  /** The latest version string returned by /api/version. */
  latestVersion: string | null;
  /** Seconds remaining before the auto-reload fires (null when no update pending). */
  countdown: number | null;
}
