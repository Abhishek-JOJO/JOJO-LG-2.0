import React from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import JOJOCommonImage, { JOJOImagePreset } from "@/components/ui/JOJOCommonImage";
import { SearchSkeleton } from "./SearchSkeleton";
import { NoResults } from "./NoResults";
import { useTranslations } from "next-intl";
import { useSearch } from "@/features/search/hooks/useSearch";

interface SearchResultsProps {
  query: string;
}

export function SearchResults({ query }: SearchResultsProps) {
  const t = useTranslations("Search");
  const router = useRouter();

  const { data, isLoading, error } = useSearch(query, 1, 20);

  if (isLoading) {
    return (
      <div className="py-8">
        <SearchSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500 font-medium select-none">
        {t("failed_fetch")}
      </div>
    );
  }

  // Safely extract the results from various possible response formats
  const responseData = data?.data || data || [];
  const items = Array.isArray(responseData)
    ? responseData
    : Array.isArray(responseData?.records)
      ? responseData.records
      : Array.isArray(responseData?.items)
        ? responseData.items
        : Array.isArray(responseData?.assets)
          ? responseData.assets
          : Array.isArray(responseData?.results)
            ? responseData.results
            : [];

  if (items.length === 0) {
    return <NoResults query={query} />;
  }

  return (
    <div className="space-y-6 py-6 animate-fade-in">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-theme_1 tracking-wide">
        {t("results_for")} &ldquo;{query}&rdquo;
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        {items.map((item: any, idx: number) => {
          const asset = item?.asset || item;
          let itemTitle = "";
          let imageUrl = "";

          if (item?.genre) {
            itemTitle = item.genre.name || "";
            imageUrl = item.genre.image || "";
          } else {
            itemTitle =
              asset?.asset_title ||
              asset?.name_analytics ||
              asset?.title ||
              asset?.name ||
              "";

            if (asset) {
              const portraitArr = asset.portrait;
              if (Array.isArray(portraitArr) && portraitArr.length > 0) {
                const def = portraitArr.find((img: any) => img.is_default);
                imageUrl = def?.url || portraitArr[0]?.url || "";
              }
              if (!imageUrl) {
                const posterArr = asset.poster;
                if (Array.isArray(posterArr) && posterArr.length > 0) {
                  const def = posterArr.find((img: any) => img.is_default);
                  imageUrl = def?.url || posterArr[0]?.url || "";
                }
              }
              if (!imageUrl) {
                const landscapeArr = asset.landscape;
                if (Array.isArray(landscapeArr) && landscapeArr.length > 0) {
                  const def = landscapeArr.find((img: any) => img.is_default);
                  imageUrl = def?.url || landscapeArr[0]?.url || "";
                }
              }
            }
            if (!imageUrl) {
              imageUrl = asset?.image || asset?.thumbnail || item?.image || item?.thumbnail || "";
            }
          }

          const assetId = asset?.id || asset?.asset_id || item?.item_id || item?.id;

          const handleCardClick = () => {
            if (assetId) router.push(ROUTES.WATCH(String(assetId)));
          };

          return (
            <div
              key={idx}
              onClick={handleCardClick}
              className="group cursor-pointer select-none rounded-lg overflow-hidden relative aspect-[2/3] bg-theme_1/[0.02] border border-theme_1/5 hover:border-theme_1/10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              {imageUrl ? (
                <JOJOCommonImage
                  src={imageUrl}
                  alt={itemTitle}
                  fill
                  preset={JOJOImagePreset.Product}
                  wrapperClassName="w-full h-full object-cover transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs text-theme_1/40">
                  {itemTitle}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <span className="text-theme_1 text-xs sm:text-sm font-semibold truncate w-full">
                  {itemTitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
