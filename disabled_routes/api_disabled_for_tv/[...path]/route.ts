import { NextRequest, NextResponse } from "next/server";
import { executeBackendRequest, getClientIp } from "@/lib/bff/services/requestHelper";
import { getAuthSessionToken, setAuthSessionCookie, clearAuthSessionCookie } from "@/lib/bff/cookies/authCookies";
import { bffStructuredLogger } from "@/lib/bff/logger";
import { getOrCreateCorrelationId } from "@/lib/bff/correlation";

async function handleBffProxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await context.params;
    const path = "/" + (resolvedParams.path ? resolvedParams.path.join("/") : "");
    const method = req.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

    const correlationId = getOrCreateCorrelationId(req.headers.get("x-request-id"));
    bffStructuredLogger.info(`BFF Proxy Request: ${method} ${path}`, { correlationId });

    let body: unknown = undefined;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      try {
        body = await req.json();
      } catch {
        body = undefined;
      }
    }

    // Auth Session extraction from HttpOnly Cookie or Request Header
    const cookieToken = await getAuthSessionToken();
    const headerToken = req.headers.get("sessionid");
    const sessionId = cookieToken || headerToken || undefined;

    // Header forwarding
    const forwardHeaders: Record<string, string> = {
      "x-request-id": correlationId,
    };
    const deviceId = req.headers.get("deviceid") || req.headers.get("device_id");
    const language = req.headers.get("language");
    const platform = req.headers.get("platform");
    const appVersion = req.headers.get("appversion");
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = getClientIp(req);

    if (deviceId) {
      forwardHeaders["deviceID"] = deviceId;
      forwardHeaders["device_id"] = deviceId;
    }
    if (language) forwardHeaders["language"] = language;
    if (platform) forwardHeaders["platform"] = platform;
    if (appVersion) forwardHeaders["appversion"] = appVersion;
    
    if (forwardedFor) {
      forwardHeaders["x-forwarded-for"] = forwardedFor;
    } else if (clientIp) {
      forwardHeaders["x-forwarded-for"] = clientIp;
    }
    if (clientIp) {
      forwardHeaders["x-real-ip"] = clientIp;
    }

    // URL Search Parameters
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

    // Special case: Logout
    if (path.includes("/logout")) {
      await clearAuthSessionCookie();
    }

    // Execute backend call via BFF server
    const { status, data } = await executeBackendRequest({
      method,
      endpoint: path,
      body,
      params: searchParams,
      headers: forwardHeaders,
      sessionId,
      shouldEncrypt: true,
      correlationId,
    });

    // Extract session token on successful auth responses
    let tokenToSet: string | null = null;
    if (data && typeof data === "object") {
      if (data.data && typeof data.data === "object") {
        tokenToSet = data.data.session_id || data.data.token || data.data.sessionId || null;
      }
    }

    if (tokenToSet) {
      await setAuthSessionCookie(tokenToSet);
    }

    const response = NextResponse.json(data, { status });
    response.headers.set("x-request-id", correlationId);
    return response;
  } catch (error) {
    bffStructuredLogger.error("Unhandled BFF Proxy Error", { error });
    return NextResponse.json(
      {
        metaData: {
          status: 500,
          message: "Internal Server Error in BFF Layer",
        },
        data: null,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleBffProxy(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleBffProxy(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleBffProxy(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleBffProxy(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleBffProxy(req, context);
}
