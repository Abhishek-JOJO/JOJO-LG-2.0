import { NextRequest, NextResponse } from "next/server";
import { encryptBffPayload } from "@/lib/bff/aes/encrypt";
import { bffStructuredLogger } from "@/lib/bff/logger";
import { getOrCreateCorrelationId } from "@/lib/bff/correlation";
import { fetchConfig, getAppConfig, isConfigLoaded } from "@/lib/config/app.config";
import { getAuthSessionToken } from "@/lib/bff/cookies/authCookies";
import { extractBffHeaders, getClientIp } from "@/lib/bff/services/requestHelper";

async function getAnalyticsBaseUrl(): Promise<string> {
  let url = process.env.ANALYTICS_BASE_URL || process.env.NEXT_PUBLIC_ANALYTICS_URL || "";
  try {
    if (!url) {
      if (!isConfigLoaded()) {
        await fetchConfig();
      }
      url = getAppConfig().analyticUrl || "";
    }
  } catch (error) {
    bffStructuredLogger.error("Failed to fetch analytics dynamic config on server", { error });
  }
  
  if (!url) {
    throw new Error("Analytics base URL is not configured in environment or dynamic config.");
  }
  return url.replace(/\/$/, "");
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  try {
    const resolvedParams = await context.params;
    const eventName = resolvedParams.path ? resolvedParams.path.join("/") : "";
    const correlationId = getOrCreateCorrelationId(req.headers.get("x-request-id"));

    let body: unknown = undefined;
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }

    const cookieToken = await getAuthSessionToken();
    const headerToken = req.headers.get("sessionid");
    const sessionId = cookieToken || headerToken || undefined;

    const { deviceId, language, platform, appVersion } = extractBffHeaders(req);
    const clientIp = getClientIp(req);
    const forwardedFor = req.headers.get("x-forwarded-for");

    // Auto-enrich web_bff_ip_tracking event properties with real server-detected IPs
    if (body && typeof body === "object" && (eventName.includes("web_bff_ip_tracking") || (body as any).event === "web_bff_ip_tracking")) {
      const payloadObj = body as any;
      payloadObj.properties = payloadObj.properties || {};
      if (clientIp) payloadObj.properties.client_ip = payloadObj.properties.client_ip || clientIp;
      if (forwardedFor) payloadObj.properties.forwarded_for = payloadObj.properties.forwarded_for || forwardedFor;
      if (clientIp && !payloadObj.properties.x_real_ip) payloadObj.properties.x_real_ip = clientIp;
    }

    // Encrypt payload with AES for Analytics Node Backend
    let encryptedPayload: unknown = body;
    if (body && typeof body === "object") {
      try {
        const encryptedHex = encryptBffPayload(body);
        encryptedPayload = { data: encryptedHex };
      } catch (encryptErr) {
        bffStructuredLogger.error("Analytics Payload Encryption Failed", { correlationId, error: encryptErr });
      }
    }

    const analyticsBaseUrl = await getAnalyticsBaseUrl();
    const targetUrl = `${analyticsBaseUrl}/v1/jojoevents/${eventName}`;

    bffStructuredLogger.info("BFF Proxying Encrypted Analytics Event", {
      correlationId,
      eventName,
      targetUrl,
      clientIp,
    });

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "deviceTypeCode": "3",
        "appversion": appVersion,
        "project": "JOJO",
        "language": language,
        "platform": platform,
        "deviceID": deviceId,
        "device_id": deviceId,
        "x-request-id": correlationId,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : (clientIp ? { "x-forwarded-for": clientIp } : {})),
        ...(clientIp ? { "x-real-ip": clientIp } : {}),
        ...(sessionId ? { sessionid: sessionId } : {}),
      },
      body: JSON.stringify(encryptedPayload),
    });

    let resData: any = { status: "success" };
    try {
      resData = await res.json();
    } catch (parseError) {
      if (!res.ok) {
        bffStructuredLogger.error("Analytics upstream error", { correlationId, status: res.status });
      } else {
        bffStructuredLogger.warn("Analytics response was not JSON", { correlationId });
      }
    }

    return NextResponse.json(resData, { status: res.status });
  } catch (error) {
    bffStructuredLogger.error("BFF Analytics Proxy Exception", { error });
    return NextResponse.json({ metaData: { status: 200, message: "Handled" } }, { status: 200 });
  }
}
