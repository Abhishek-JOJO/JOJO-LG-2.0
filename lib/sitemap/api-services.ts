import { getAppNavigation } from "@/features/navigation/api/getAppNavigation";
import { mapNavigationResponse } from "@/features/navigation/model/types";
import { getContentRails } from "@/features/content-rail/api/getContentRails";
import { mapApiRailItem } from "@/components/content-rail/utils/contentRail.mapper";
import { slugify } from "@/features/asset/store/useAssetDetailStore";
import { SitemapUrl } from "./xml-helpers";

const FALLBACK_SUBNAV_IDS: Record<string, number> = {
  movies: 2,
  shows: 3,
  natak: 4,
  nataks: 4,
  kids: 5,
  kidz: 5,
};

export async function getDynamicSubnavId(type: "movies" | "shows" | "natak" | "nataks" | "kidz" | "kids"): Promise<number | null> {
  const targetType = type.toLowerCase();
  
  try {
    const response = await getAppNavigation();
    const items = mapNavigationResponse(response);
    
    for (const item of items) {
      const title = item.title.toLowerCase();
      // Match by exact url mapped or by known title variations
      if (item.url === `/${targetType}` || title === targetType || 
         (targetType === 'kids' && title === 'kidz') || 
         (targetType === 'kidz' && title === 'kids') ||
         (targetType === 'nataks' && title === 'natak') ||
         (targetType === 'natak' && title === 'nataks')
      ) {
        return item.subnav_id;
      }
    }
  } catch (error) {
    console.error("[Sitemap API] Failed to fetch navigation for ID:", error);
  }

  // Fallback to static known subnav ID if API returns 403 / unauthenticated / null
  return FALLBACK_SUBNAV_IDS[targetType] ?? null;
}

export async function fetchCategoryUrls(subnavId: number, basePath: string): Promise<SitemapUrl[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jojoapp.in";
  const dynamicUrls: SitemapUrl[] = [];
  const seenUrls = new Set<string>(); // O(1) constant time lookup for deduplication
  let currentPage = 1;
  let hasNextPage = true;
  const maxPageLimit = 10; // Protect server memory

  const isKidsCategory = basePath.toLowerCase().includes("kids") || basePath.toLowerCase().includes("kidz");

  while (hasNextPage && currentPage <= maxPageLimit) {
    try {
      const railsResponse = (await getContentRails(subnavId, currentPage, undefined, 50)) as any;
      const data = railsResponse?.data;
      const rails = data?.content_rail_items || data?.rails || data || [];

      let itemsFound = 0;

      if (Array.isArray(rails) && rails.length > 0) {
        for (const rail of rails) {
          const displayType = rail?.cr_display_type || rail?.display_type;
          const items = rail?.cr_items || rail?.items || rail?.content_rail_items || [];
          
          if (Array.isArray(items)) {
            items.forEach((item: any, idx: number) => {
              const mappedItem = mapApiRailItem(item, idx, displayType);
              const assetId = mappedItem?.assetId;
              const rawTitle = mappedItem?.title;

              if (assetId && rawTitle && rawTitle !== "Untitled") {
                itemsFound++;
                const slug = slugify(rawTitle);
                const fullUrl = `${baseUrl}/${basePath}/${slug}/${assetId}`;

                if (!seenUrls.has(fullUrl)) {
                  seenUrls.add(fullUrl);

                  // Robust image extraction using mapApiRailItem helpers
                  const thumbnail =
                    mappedItem.landscapeImage ||
                    mappedItem.posterImage ||
                    mappedItem.portraitImage ||
                    mappedItem.image ||
                    mappedItem.heroImage;

                  // Extract description and strip HTML tags (e.g. <p>, <span>) for clean search snippets
                  const rawDesc =
                    mappedItem.description ||
                    mappedItem.subtitle ||
                    `${rawTitle} on JOJO App`;
                  const description = rawDesc.replace(/<[^>]*>?/gm, "").trim();

                  // Raw duration parsing
                  const rawAsset = item?.details || item?.asset || item;
                  const rawDur = rawAsset?.asset_total_duration || rawAsset?.duration;
                  const durationSec = rawDur ? Math.round(parseFloat(rawDur)) : undefined;

                  // Subscription requirement
                  const requiresSub = mappedItem.isPremium ? "yes" : "no";
                  const releaseDate = rawAsset?.asset_release_date || rawAsset?.releaseDate || undefined;

                  const sitemapItem: SitemapUrl = {
                    loc: fullUrl,
                    lastmod: new Date().toISOString(),
                    changefreq: "weekly",
                    priority: 0.6,
                  };

                  if (thumbnail) {
                    sitemapItem.image_loc = thumbnail;
                    sitemapItem.images = [{ loc: thumbnail }];
                  }

                  if (thumbnail && rawTitle) {
                    sitemapItem.video = {
                      thumbnail_loc: thumbnail,
                      title: rawTitle,
                      description: description,
                      player_loc: `${fullUrl}?watch=true`,
                      duration: durationSec && durationSec > 0 ? durationSec : undefined,
                      publication_date: releaseDate,
                      requires_subscription: requiresSub,
                      family_friendly: isKidsCategory ? "yes" : "no",
                    };
                  }

                  dynamicUrls.push(sitemapItem);
                }
              }
            });
          }
        }
      }

      const meta =
        railsResponse?.metaData ||
        railsResponse?.["meta-data"] ||
        railsResponse?.metadata ||
        data?.["meta-data"] ||
        data?.metadata;

      if (meta && itemsFound > 0) {
        const totalPages = Number(meta.total_pages) || 1;
        const current = Number(meta.current_page) || currentPage;
        hasNextPage = current < totalPages;
        currentPage++;
      } else {
        hasNextPage = false;
      }
    } catch (error) {
      console.error(`[Sitemap] Failed to fetch items for subnav ${subnavId} page ${currentPage}:`, error);
      hasNextPage = false;
    }
  }

  return dynamicUrls;
}


