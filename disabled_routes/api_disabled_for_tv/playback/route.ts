import { NextRequest, NextResponse } from "next/server";
import { executeBackendRequest, extractBffHeaders } from "@/lib/bff/services/requestHelper";
import { getAuthSessionToken } from "@/lib/bff/cookies/authCookies";
import { bffRateLimiter } from "@/lib/bff/rate-limiter";
import { bffStructuredLogger } from "@/lib/bff/logger";
import { getOrCreateCorrelationId } from "@/lib/bff/correlation";
import { formatBffError } from "@/lib/bff/errors";
import { playbackRequestSchema } from "@/lib/bff/validators/playback.schema";
import { encryptBffPayload } from "@/lib/bff/aes/encrypt";
import { decryptBffPayload } from "@/lib/bff/aes/decrypt";

async function handlePlaybackProxy(req: NextRequest, method: "GET" | "POST") {
  const correlationId = getOrCreateCorrelationId(req.headers.get("x-request-id"));
  const { deviceId, language, platform, appVersion, ip } = extractBffHeaders(req);



  const isBrowserEncrypted = req.headers.get("x-encrypted") === "1";

  let body: unknown = undefined;
  if (method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }

    // Decrypt if browser encrypted
    if (isBrowserEncrypted && body && typeof body === "object" && "_enc" in (body as Record<string, unknown>)) {
      try {
        const encHex = (body as Record<string, unknown>)._enc as string;
        body = decryptBffPayload(encHex);
        bffStructuredLogger.info("BFF decrypted browser-encrypted playback payload", { correlationId });
      } catch (decErr) {
        bffStructuredLogger.error("BFF failed to decrypt browser-encrypted playback payload", { correlationId, error: decErr });
        return NextResponse.json(formatBffError(400, "Failed to decrypt playback request"), { status: 400 });
      }
    }

    if (body && typeof body === "object") {
      const parseResult = playbackRequestSchema.safeParse(body);
      if (!parseResult.success) {
        bffStructuredLogger.warn("Playback Request Validation Failed", { correlationId, issues: parseResult.error.issues });
        return NextResponse.json(formatBffError(400, "Invalid playback request parameters"), { status: 400 });
      }
    }
  }

  const cookieToken = await getAuthSessionToken();
  const headerToken = req.headers.get("sessionid");
  const sessionId = cookieToken || headerToken || undefined;

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  bffStructuredLogger.info("Executing Secure Playback Request", {
    correlationId,
    method,
    hasSessionId: !!sessionId,
    deviceId,
  });

  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip") || (req as any).ip;
  const forwardHeaders: Record<string, string> = {
    deviceID: deviceId,
    device_id: deviceId,
    language,
    platform,
    appversion: appVersion,
    "x-request-id": correlationId,
  };
  if (forwardedFor) forwardHeaders["x-forwarded-for"] = forwardedFor;
  if (realIp) forwardHeaders["x-real-ip"] = realIp;

  const { status, data } = await executeBackendRequest({
    method,
    endpoint: "/playback",
    body,
    params: searchParams,
    headers: forwardHeaders,
    sessionId,
    shouldEncrypt: true,
    correlationId,
  });

  let responseData = data;
  if (isBrowserEncrypted && status >= 200 && status < 300) {
    try {
      const responseJson = JSON.stringify(data);
      const encryptedResponse = encryptBffPayload(responseJson);
      responseData = { _enc: encryptedResponse };
      bffStructuredLogger.info("BFF encrypted response for browser", { correlationId });
    } catch (encErr) {
      bffStructuredLogger.error("BFF failed to encrypt playback response for browser", { correlationId, error: encErr });
    }
  }

  const response = NextResponse.json(responseData, { status });

  // Reinforce Security Headers for Playback API Response (Prevent proxy caching of stream metadata)
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("x-request-id", correlationId);

  return response;
}

export async function POST(req: NextRequest) {
  return handlePlaybackProxy(req, "POST");
}

export async function GET(req: NextRequest) {
  return handlePlaybackProxy(req, "GET");
}
