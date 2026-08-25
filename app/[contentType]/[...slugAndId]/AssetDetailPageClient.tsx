"use client";

import { AssetDetailView } from "@/features/asset/ui/AssetDetailView";
import { notFound, useParams, usePathname } from "next/navigation";
import React from "react";

const VALID_TYPES = ["movies", "shows", "nataks", "live", "kids", "kidz"];

import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";
import { useEffect } from "react";

import { restorePageFocus } from "@/src/navigation/focusUtils";

export default function AssetDetailPageClient({ initialAsset }: { initialAsset?: any }) {
  const params = useParams();
  const pathname = usePathname();

  // contentType comes from dynamic [contentType] param OR is inferred from
  // the pathname when this component is rendered inside a static route folder
  // (e.g. /movies/[...slugAndId], /shows/[...slugAndId])
  const contentType =
    (typeof params?.contentType === "string" ? params.contentType : "") ||
    VALID_TYPES.find((t) => pathname.startsWith(`/${t}/`)) ||
    "";

  // Extract slugAndId (can be array or string if single param matched by catchall)
  const slugAndIdRaw = params?.slugAndId;
  const slugAndId = Array.isArray(slugAndIdRaw)
    ? slugAndIdRaw
    : typeof slugAndIdRaw === "string"
      ? [slugAndIdRaw]
      : [];

  // Validate route parameters
  if (contentType && !VALID_TYPES.includes(contentType)) {
    notFound();
  }

  // Extract assetId (last element of slugAndId catch-all array)
  const assetId = slugAndId.length > 0 ? slugAndId[slugAndId.length - 1] : "";

  if (!assetId) {
    notFound();
  }

  const { ref: focusRef, focusKey } = useFocusable({
    focusKey: `PAGE_ASSET_DETAIL_${assetId}`,
    isFocusBoundary: true, // Establishing a proper boundary for the page
  });

  useEffect(() => {
    // Attempt to focus the page root when it mounts so spatial navigation isn't lost
    const timer = setTimeout(() => {
      setFocus(`PAGE_ASSET_DETAIL_${assetId}`);
    }, 100);

    return () => {
      clearTimeout(timer);
      restorePageFocus();
    };
  }, [assetId]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={focusRef as any} className="min-h-screen" style={{ background: "var(--theme_12)" }}>
        <AssetDetailView assetId={assetId} initialAsset={initialAsset} isStandalone={true} />
      </div>
    </FocusContext.Provider>
  );
}
