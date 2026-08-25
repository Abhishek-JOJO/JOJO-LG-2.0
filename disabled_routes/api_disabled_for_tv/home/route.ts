import { NextRequest, NextResponse } from "next/server";
import { executeBackendRequest } from "@/lib/bff/services/requestHelper";
import { getAuthSessionToken } from "@/lib/bff/cookies/authCookies";

export async function GET(req: NextRequest) {
  const cookieToken = await getAuthSessionToken();
  const headerToken = req.headers.get("sessionid");
  const sessionId = cookieToken || headerToken || undefined;

  const deviceId = req.headers.get("deviceid") || req.headers.get("device_id") || "server-bff-session";
  const language = req.headers.get("language") || "1";
  const platform = req.headers.get("platform") || "Web";

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip") || (req as any).ip;
  const forwardHeaders: Record<string, string> = {
    deviceID: deviceId,
    device_id: deviceId,
    language,
    platform,
  };
  if (forwardedFor) forwardHeaders["x-forwarded-for"] = forwardedFor;
  if (realIp) forwardHeaders["x-real-ip"] = realIp;

  const { status, data } = await executeBackendRequest({
    method: "GET",
    endpoint: "/getAppNavigation",
    params: searchParams,
    headers: forwardHeaders,
    sessionId,
    shouldEncrypt: true,
    cacheTtlMs: 300000, // 5 min cache for navigation
  });

  return NextResponse.json(data, { status });
}
