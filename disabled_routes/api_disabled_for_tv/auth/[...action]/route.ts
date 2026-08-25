import { NextRequest, NextResponse } from "next/server";
import { executeBackendRequest } from "@/lib/bff/services/requestHelper";
import { getAuthSessionToken, setAuthSessionCookie, clearAuthSessionCookie } from "@/lib/bff/cookies/authCookies";
import { bffRateLimiter } from "@/lib/bff/rate-limiter";
import { formatBffError } from "@/lib/bff/errors";
import { sendOtpSchema, verifyOtpSchema } from "@/lib/bff/validators/auth.schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string[] }> }) {
  const resolvedParams = await params;
  const actionPath = "/" + resolvedParams.action.join("/");
  const ip = req.headers.get("x-forwarded-for") || "client-ip";



  let body: any = undefined;
  try {
    body = await req.json();
  } catch {
    body = undefined;
  }

  // Zod Validation
  if (actionPath.includes("send-otp") && body) {
    const parse = sendOtpSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(formatBffError(400, parse.error.issues[0]?.message || "Invalid payload"), { status: 400 });
    }
  }

  if (actionPath.includes("verify-otp") && body) {
    const parse = verifyOtpSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(formatBffError(400, parse.error.issues[0]?.message || "Invalid payload"), { status: 400 });
    }
  }

  const cookieToken = await getAuthSessionToken();
  const headerToken = req.headers.get("sessionid");
  const sessionId = cookieToken || headerToken || undefined;

  const deviceId = req.headers.get("deviceid") || req.headers.get("device_id") || "server-bff-session";
  const language = req.headers.get("language") || "1";
  const platform = req.headers.get("platform") || "Web";
  const appVersion = req.headers.get("appversion") || "2.0.0";

  const forwardHeaders: Record<string, string> = {
    deviceID: deviceId,
    device_id: deviceId,
    language,
    platform,
    appversion: appVersion,
  };
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip") || (req as any).ip;
  if (forwardedFor) forwardHeaders["x-forwarded-for"] = forwardedFor;
  if (realIp) forwardHeaders["x-real-ip"] = realIp;

  // Reconstruct the full backend path.
  // This handler ONLY receives requests that originated from /auth/* enum paths
  // (e.g. /auth/verify-special-user, /auth/google-login).
  // All /v3/auth/* enum paths go directly to the [...path] catch-all and never reach here.
  // Therefore: actionPath is always the suffix after /auth/ → prepend /auth back.
  // Guard: if somehow a /v3/auth/ path reaches here (future edge case), pass it through as-is.
  const endpoint = actionPath.startsWith("/v3/") ? actionPath : `/auth${actionPath}`;

  const { status, data } = await executeBackendRequest({
    method: "POST",
    endpoint,
    body,
    headers: forwardHeaders,
    sessionId,
    shouldEncrypt: true,
  });

  // Extract session token on successful login/verify-otp/guest
  let tokenToSet: string | null = null;
  if (data && typeof data === "object") {
    if (data.data && typeof data.data === "object") {
      tokenToSet = data.data.session_id || data.data.token || data.data.sessionId || null;
    }
  }

  if (tokenToSet) {
    await setAuthSessionCookie(tokenToSet);
  }

  if (actionPath.includes("logout")) {
    await clearAuthSessionCookie();
  }

  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string[] }> }) {
  const resolvedParams = await params;
  const actionPath = "/" + resolvedParams.action.join("/");

  const cookieToken = await getAuthSessionToken();
  const headerToken = req.headers.get("sessionid");
  const sessionId = cookieToken || headerToken || undefined;

  const deviceId = req.headers.get("deviceid") || req.headers.get("device_id") || "server-bff-session";
  const language = req.headers.get("language") || "1";
  const platform = req.headers.get("platform") || "Web";

  const forwardHeaders: Record<string, string> = {
    deviceID: deviceId,
    device_id: deviceId,
    language,
    platform,
  };
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip") || (req as any).ip;
  if (forwardedFor) forwardHeaders["x-forwarded-for"] = forwardedFor;
  if (realIp) forwardHeaders["x-real-ip"] = realIp;

  // Reconstruct the full backend path.
  // This handler ONLY receives requests that originated from /auth/* enum paths
  // (e.g. /auth/verify-special-user, /auth/google-login).
  // All /v3/auth/* enum paths go directly to the [...path] catch-all and never reach here.
  // Therefore: actionPath is always the suffix after /auth/ → prepend /auth back.
  // Guard: if somehow a /v3/auth/ path reaches here (future edge case), pass it through as-is.
  const endpoint = actionPath.startsWith("/v3/") ? actionPath : `/auth${actionPath}`;
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  const { status, data } = await executeBackendRequest({
    method: "GET",
    endpoint,
    params: searchParams,
    headers: forwardHeaders,
    sessionId,
    shouldEncrypt: true,
    cacheTtlMs: actionPath.includes("country-list") ? 300000 : 0, // 5 min cache for country list
  });

  return NextResponse.json(data, { status });
}
