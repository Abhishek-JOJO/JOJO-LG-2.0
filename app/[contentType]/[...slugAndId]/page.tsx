import AssetDetailPageClient from "./AssetDetailPageClient";
import React, { cache } from "react";
import { Metadata } from "next";
import { getAsset } from "@/features/content/api/getAsset";
import { mapContentAsset } from "@/features/content/model/mapper";
import { prefetchAssetDetail } from "@/lib/ssr/prefetchAsset";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { slugify, unslugify } from "@/features/asset/store/useAssetDetailStore";

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/api/client";

interface Props {
  params: Promise<{
    contentType: string;
    slugAndId: string | string[];
  }>;
}

/**
 * Fetch a guest token from the BFF endpoint.
 * Only called when there is no user session cookie.
 * Uses the internal BFF path (/api/v3/auth/guest) so it goes through the
 * Next.js API route instead of hitting the backend directly — this avoids
 * the "server-side direct backend call with empty deviceID" failure.
 */
const getCachedGuestToken = cache(async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    if (!baseUrl) return "";
    const res = await fetch(`${baseUrl}/api/v3/auth/guest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: "data" }),
    });
    if (!res.ok) return "";
    const json = await res.json();
    return (json?.data?.session_id || json?.data?.data?.session_id || "") as string;
  } catch {
    return "";
  }
});

/**
 * Resolve a sessionId for SSR.
 * Priority: auth cookie → guest token from BFF → undefined (no token).
 * Deliberately falls through to undefined rather than throwing —
 * many asset endpoints are publicly accessible without a session.
 */
async function resolveSessionId(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("jojo_auth_token")?.value;
    if (authCookie) return authCookie;
  } catch {
    // Static HTML export build mode or outside request context
  }

  // Only attempt guest token if there's no user cookie.
  // This is non-critical — if it fails, we still try the asset fetch without a token.
  const guestToken = await getCachedGuestToken().catch(() => "");
  return guestToken || undefined;
}

/**
 * Fetch and map an asset, with a two-phase strategy:
 * 1. Try with the provided sessionId (may be auth cookie or guest token).
 * 2. If that fails AND we had a token, retry without any token (public access).
 * This ensures SSR succeeds even when the guest token endpoint is flaky.
 */
const getCachedAsset = cache(async (assetId: string, sessionId?: string) => {
  console.log(`[Server getCachedAsset] Fetching assetId: "${assetId}", sessionId exists: ${!!sessionId}`);
  try {
    const response = await getAsset(assetId, sessionId);
    if (!response || !response.data) {
      // If token-based fetch returned empty, retry without token (public endpoint)
      if (sessionId) {
        console.log(`[Server getCachedAsset] Token fetch returned empty, retrying without token for assetId: "${assetId}"`);
        const publicResponse = await getAsset(assetId, undefined);
        if (!publicResponse || !publicResponse.data) return null;
        return mapContentAsset(publicResponse);
      }
      return null;
    }
    return mapContentAsset(response);
  } catch (error) {
    console.log(`[Server getCachedAsset] Primary fetch error for assetId "${assetId}":`, error);
    // Retry without token as a last resort
    if (sessionId) {
      try {
        console.log(`[Server getCachedAsset] Retrying without token for assetId: "${assetId}"`);
        const publicResponse = await getAsset(assetId, undefined);
        if (!publicResponse || !publicResponse.data) return null;
        return mapContentAsset(publicResponse);
      } catch (retryError) {
        console.log(`[Server getCachedAsset] Retry also failed for assetId "${assetId}":`, retryError);
        return null;
      }
    }
    return null;
  }
});

import { sanitizeMetaDescription, buildSeoTitle, buildAssetKeywords, buildAssetMetadata } from "@/lib/seo/seoUtils";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slugAndIdRaw = resolvedParams.slugAndId;
  const slugAndId = Array.isArray(slugAndIdRaw) ? slugAndIdRaw : typeof slugAndIdRaw === "string" ? [slugAndIdRaw] : [];
  const assetId = slugAndId.length > 0 ? slugAndId[slugAndId.length - 1] : "";

  const fallbackTitle = slugAndId.length > 1 ? `${unslugify(slugAndId[0])} - Watch Online | JOJO` : "Content Not Found | JOJO";

  if (!assetId) {
    return { title: fallbackTitle };
  }

  const sessionId = await resolveSessionId();
  console.log(`[Server generateMetadata] assetId: "${assetId}", sessionId length: ${sessionId?.length || 0}`);

  try {
    const asset = await getCachedAsset(assetId, sessionId);
    if (!asset) {
      console.log(`[Server generateMetadata] Asset was resolved as null for assetId: "${assetId}"`);
      return { title: fallbackTitle };
    }
    console.log(`[Server generateMetadata] Successfully resolved asset title: "${asset.title}"`);

    const isShow = asset.assetType === "SHOW";
    const categoryLabel = isShow ? "Gujarati Web Series" : "Gujarati Content";

    const title = buildSeoTitle(asset.title, asset.seoTitle, categoryLabel);
    const rawDesc = asset.seoDescription || asset.description || `Watch ${asset.title || "premium content"} ${isShow ? "original episodes" : "full movie"} online in HD on JOJO App.`;
    const description = sanitizeMetaDescription(rawDesc);
    const imageUrl = asset.landscape?.url || asset.poster?.url || "";
    const slug = asset.title ? slugify(asset.title) : (slugAndId.length > 1 ? slugAndId[0] : "");
    const canonicalUrl = `https://jojoapp.in/${resolvedParams.contentType}/${slug}/${assetId}`;
    const keywords = buildAssetKeywords(asset.title, asset.genres, asset.assetType, categoryLabel);

    return buildAssetMetadata({
      title,
      description,
      canonicalUrl,
      imageUrl,
      ogType: isShow ? "video.tv_show" : "video.movie",
      keywords,
    });
  } catch (error) {
    console.error("[Server generateMetadata Error]:", error);
    return { title: fallbackTitle };
  }
}

import { buildMovieSchema, buildTVSeriesSchema, buildBreadcrumbSchema, buildVideoObjectSchema } from "@/lib/seo/schema";

export default async function StandaloneAssetDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const slugAndIdRaw = resolvedParams.slugAndId;
  const slugAndId = Array.isArray(slugAndIdRaw) ? slugAndIdRaw : typeof slugAndIdRaw === "string" ? [slugAndIdRaw] : [];
  const assetId = slugAndId.length > 0 ? slugAndId[slugAndId.length - 1] : "";

  if (!assetId) {
    notFound();
  }

  let queryClient;
  let schema = null;
  let videoSchema = null;
  let breadcrumbs = null;

  const sessionId = await resolveSessionId();
  console.log(`[Server StandaloneAssetDetailPage] assetId: "${assetId}", sessionId length: ${sessionId?.length || 0}`);

  let asset = null;
  try {
    asset = await getCachedAsset(assetId, sessionId);
  } catch (error) {
    console.error("[Server StandaloneAssetDetailPage Fetch Error]:", error);
  }

  if (asset) {
    console.log(`[Server StandaloneAssetDetailPage] Successfully resolved asset title: "${asset.title}"`);
  } else {
    console.log(`[Server StandaloneAssetDetailPage] Asset was resolved as null for assetId: "${assetId}" (possibly due to missing socket check during SSR). Deferring resolution to client-side.`);
  }

  try {
    queryClient = await prefetchAssetDetail(assetId, sessionId);

    if (asset) {
      if (asset.assetType === "SHOW") {
        schema = buildTVSeriesSchema(asset);
      } else {
        schema = buildMovieSchema(asset);
        videoSchema = buildVideoObjectSchema(asset);
      }
      const categorySlug = resolvedParams.contentType;
      const categoryName = categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);
      breadcrumbs = buildBreadcrumbSchema([
        { name: "Home", item: "https://jojoapp.in" },
        { name: categoryName, item: `https://jojoapp.in/${categorySlug}` },
        { name: asset.title, item: `https://jojoapp.in/${categorySlug}/${slugify(asset.title)}/${asset.assetId}` },
      ]);
    }
  } catch (error) {
    console.error("[Server StandaloneAssetDetailPage Metadata/Prefetch Error]:", error);
  }

  return (
    <HydrationBoundary state={queryClient ? dehydrate(queryClient) : undefined}>
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      {videoSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }}
        />
      )}
      {breadcrumbs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
        />
      )}
      <AssetDetailPageClient />
    </HydrationBoundary>
  );
}



export function generateStaticParams() {
  return [
    { 
      contentType: "placeholder", 
      slugAndId: ["placeholder"],
      "/[contentType]/[...slugAndId]": ["placeholder"]
    }
  ];
}
