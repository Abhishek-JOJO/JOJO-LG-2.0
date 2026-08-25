import { getQueryClient } from "@/lib/react-query/queryClient";
import { cookies } from "next/headers";
import { getAsset } from "@/features/content/api/getAsset";
import { mapContentAsset } from "@/features/content/model/mapper";
import { applyAssetCategoryOverride } from "@/features/asset/utils/assetCategoryOverride";
import { AssetCategoryCode } from "@/features/content/model/types";

export async function prefetchAssetDetail(assetId: string, resolvedSessionId?: string) {
  const queryClient = getQueryClient();
  const cookieStore = await cookies();
  const sessionId = resolvedSessionId !== undefined ? resolvedSessionId : cookieStore.get("jojo_auth_token")?.value;
  const locale = cookieStore.get("jojo_locale")?.value || "en";
  // Next.js server can't easily do geo-location without CF headers, 
  // but we can try to read the CF-IPCountry header if available, or just skip it on SSR.
  // Actually, useAsset does it on the client. But we can prefetch the raw asset.

  await queryClient.prefetchQuery({
    queryKey: ['asset', assetId, sessionId, locale],
    queryFn: async () => {
      // IMPORTANT: We MUST throw (not return null) when the server-side fetch fails.
      // Returning null causes React Query to cache it as valid `status: 'success', data: null`.
      // The client then picks up this cached null and never re-fetches, showing a false 404.
      // Throwing lets prefetchQuery silently discard the failure, so the client can
      // make its own fresh request via the socket-authenticated path.
      const response = await getAsset(assetId, sessionId ?? undefined);
      if (!response || !response.data) {
        throw new Error(`[SSR prefetch] No data returned for assetId "${assetId}"`);
      }
      const asset = mapContentAsset(response);

      // Overseas logic is tricky on Node.js without headers. 
      // We will skip `applyAssetCategoryOverride` on SSR, and let the Client re-evaluate it if it's an overseas IP.
      const isOverseasStr = cookieStore.get("jojo_is_overseas")?.value;
      const isOverseas = isOverseasStr === "true";

      if (isOverseas && asset) {
        const override = applyAssetCategoryOverride({
          assetId: asset.assetId,
          originalCategoryCode: asset.assetCategoryCode,
          isOverseas,
          assetTitle: asset.title,
        });

        if (override.wasOverridden) {
          asset.assetCategoryCode = override.categoryCode as AssetCategoryCode;
          (asset as any).overrideReason = override.reason;
        }
      }

      return asset;
    }
  });

  return queryClient;
}

