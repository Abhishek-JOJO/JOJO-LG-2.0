import AssetDetailPageClient from "@/app/[contentType]/[...slugAndId]/AssetDetailPageClient";
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
    slugAndId: string | string[];
  }>;
}

import { executeBackendRequest } from "@/lib/bff/services/requestHelper";

const getCachedGuestToken = cache(async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    if (!baseUrl) return "";
    const { status, data } = await executeBackendRequest({
      method: "POST",
      endpoint: "/v3/auth/guest",
      body: { data: "data" },
      shouldEncrypt: true,
    });

    if (status === 200 && data) {
      const token = data?.data?.session_id || data?.data?.data?.session_id || data?.session_id || "";
      if (token) return token as string;
    }
  } catch {
    // ignore
  }
  return "";
});

async function resolveSessionId(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("jojo_auth_token")?.value;
    if (authCookie) return authCookie;
  } catch {
    // Static HTML export build mode or outside request context
  }

  const guestToken = await getCachedGuestToken().catch(() => "");
  return guestToken || undefined;
}

const getCachedAsset = cache(async (assetId: string, sessionId?: string) => {
  try {
    let activeSession = sessionId;
    if (!activeSession) {
      activeSession = await getCachedGuestToken().catch(() => "");
    }

    let { status, data } = await executeBackendRequest({
      method: "POST",
      endpoint: `/asset/${assetId}`,
      body: {},
      sessionId: activeSession || undefined,
      shouldEncrypt: true,
    });

    if (status === 200 && data && data.data) {
      return mapContentAsset(data);
    }

    // Fallback: search public content-rails for asset metadata if /asset/{id} is protected/forbidden
    const railsRes = await executeBackendRequest({
      method: "GET",
      endpoint: "/1/content-rails",
      params: { page: "1", limit: "50" },
      sessionId: activeSession || undefined,
      shouldEncrypt: true,
    });

    if (railsRes.status === 200 && railsRes.data?.data) {
      const rails = (railsRes.data.data as any)?.content_rail_items || [];
      for (const r of rails) {
        for (const item of r.cr_items || []) {
          const a = item.asset || item;
          if (String(item.item_id) === String(assetId) || String(a?.asset_id) === String(assetId)) {
            if (a) {
              return mapContentAsset({ data: a } as any);
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`[Server Movies getCachedAsset Error] assetId "${assetId}":`, error);
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

  const defaultOgImage = "/logos/JOJO_LOGO.png";

  if (!assetId) {
    return buildAssetMetadata({
      title: fallbackTitle,
      description: "Watch the best Gujarati movies, web series, and nataks on JOJO.",
      canonicalUrl: "https://jojoapp.in",
      imageUrl: defaultOgImage,
      ogType: "video.movie",
      keywords: ["JOJO App", "Gujarati OTT"],
    });
  }

  const sessionId = await resolveSessionId();

  try {
    const asset = await getCachedAsset(assetId, sessionId);
    if (!asset) {
      const fallbackSlug = slugAndId.length > 1 ? slugAndId[0] : "";
      return buildAssetMetadata({
        title: fallbackTitle,
        description: "Watch premium Gujarati movies and series online on JOJO App.",
        canonicalUrl: `https://jojoapp.in/movies/${fallbackSlug}/${assetId}`.replace(/\/+$/, ""),
        imageUrl: defaultOgImage,
        ogType: "video.movie",
        keywords: ["JOJO App", "Gujarati Movies"],
      });
    }

    const isShow = asset.assetType === "SHOW";
    const categoryLabel = isShow ? "Gujarati Web Series" : "Gujarati Movie";

    const title = buildSeoTitle(asset.title, asset.seoTitle, categoryLabel);
    const rawDesc = asset.seoDescription || asset.description || `Watch ${asset.title || "premium content"} ${isShow ? "original episodes" : "full movie"} online in HD on JOJO App.`;
    const description = sanitizeMetaDescription(rawDesc);
    const imageUrl = asset.landscape?.url || asset.poster?.url || defaultOgImage;
    const slug = asset.title ? slugify(asset.title) : (slugAndId.length > 1 ? slugAndId[0] : "");
    const canonicalUrl = `https://jojoapp.in/movies/${slug}/${assetId}`;
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
    const fallbackSlug = slugAndId.length > 1 ? slugAndId[0] : "";
    const dynamicCanonical = assetId
      ? `https://jojoapp.in/movies/${fallbackSlug}/${assetId}`.replace(/\/+$/, "")
      : "https://jojoapp.in/movies";

    return buildAssetMetadata({
      title: fallbackTitle,
      description: `Watch ${unslugify(fallbackSlug) || "Gujarati movie"} online in HD on JOJO App.`,
      canonicalUrl: dynamicCanonical,
      imageUrl: defaultOgImage,
      ogType: "video.movie",
      keywords: ["JOJO App", "Gujarati Movies"],
    });
  }
}

import { buildMovieSchema, buildBreadcrumbSchema, buildVideoObjectSchema } from "@/lib/seo/schema";

export default async function MoviesAssetDetailPage({ params }: Props) {
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

  let asset = null;
  try {
    asset = await getCachedAsset(assetId, sessionId);
  } catch (error) {
    console.error("[Server MoviesAssetDetailPage Fetch Error]:", error);
  }

  try {
    queryClient = await prefetchAssetDetail(assetId, sessionId);

    if (asset) {
      schema = buildMovieSchema(asset);
      videoSchema = buildVideoObjectSchema(asset);
      breadcrumbs = buildBreadcrumbSchema([
        { name: "Home", item: "https://jojoapp.in" },
        { name: "Movies", item: "https://jojoapp.in/movies" },
        { name: asset.title, item: `https://jojoapp.in/movies/${slugify(asset.title)}/${asset.assetId}` },
      ]);
    }
  } catch (error) {
    console.error("[Server MoviesAssetDetailPage Metadata/Prefetch Error]:", error);
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
      <AssetDetailPageClient initialAsset={asset} />
    </HydrationBoundary>
  );
}


export function generateStaticParams() {
  return [
    { slugAndId: ["placeholder"] }
  ];
}
