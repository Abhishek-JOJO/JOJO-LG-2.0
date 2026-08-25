/**
 * /api/version — Route Handler
 *
 * Returns the current deployment version so the client can detect
 * when a new build has been deployed and trigger a page reload.
 *
 * Caching:
 *   - force-dynamic: disables Next.js build-time static rendering for this route
 *   - Cache-Control: no-store: prevents CDN/Nginx/browser from caching the response
 *
 * Works with: npm run dev | npm run build + start | AWS EC2/ECS/CodeDeploy
 */

import { NextResponse } from "next/server";
import type { VersionResponse } from "@/lib/version/version.types";

// Opt out of Next.js static rendering — always run dynamically on every request.
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<VersionResponse>> {
  const version =
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.APP_VERSION ||
    "unknown-build";

  const buildTime =
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    process.env.BUILD_TIME ||
    new Date().toISOString(); // fallback: server start time (good enough for dev)

  const environment =
    process.env.NEXT_PUBLIC_ENV_TYPE ||
    process.env.NODE_ENV ||
    "development";

  const body: VersionResponse = {
    version,
    buildTime,
    environment,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // Instruct every layer (browser, Nginx, CDN, proxy) never to cache this response.
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
