import AssetDetailPageClient from "@/app/[contentType]/[...slugAndId]/AssetDetailPageClient";
import React from "react";
import { prefetchAssetDetail } from "@/lib/ssr/prefetchAsset";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{
    slugAndId: string | string[];
  }>;
}

export default async function ShowsAssetDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const slugAndIdRaw = resolvedParams.slugAndId;
  const slugAndId = Array.isArray(slugAndIdRaw) ? slugAndIdRaw : typeof slugAndIdRaw === "string" ? [slugAndIdRaw] : [];
  const assetId = slugAndId.length > 0 ? slugAndId[slugAndId.length - 1] : "";

  if (!assetId) {
    notFound();
  }

  let queryClient;
  try {
    queryClient = await prefetchAssetDetail(assetId);
  } catch {
    // client will handle fetching
  }

  return (
    <HydrationBoundary state={queryClient ? dehydrate(queryClient) : undefined}>
      <AssetDetailPageClient />
    </HydrationBoundary>
  );
}

export function generateStaticParams() {
  return [{ slugAndId: ["placeholder"] }];
}
