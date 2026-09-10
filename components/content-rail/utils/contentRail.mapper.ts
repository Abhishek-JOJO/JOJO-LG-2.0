import { logger } from "@/lib/logger/logger";
import { ApiAssetCategory, ApiDisplayType, ApiImageRatio, ContentRailData, ContentRailItem, ContentRailType, displayTypeMap, rawToEnumMap } from "../config/contentRail.types";

export function mapApiRailType(displayType?: string | number, title?: string): ContentRailType {
  // 1. Map explicitly via displayType parameter (number, string, or constant name)
  if (displayType !== undefined && displayType !== null) {
    const typeKey = typeof displayType === "number" ? displayType : String(displayType).trim();

    // Look up in our enum-driven map
    const apiEnum = rawToEnumMap[typeKey];
    if (apiEnum && displayTypeMap[apiEnum]) {
      return displayTypeMap[apiEnum];
    }
  }

  // 2. Fallback based on keywords in title
  if (title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("top 10") || lowerTitle.includes("top10")) {
      return ContentRailType.TOP_10;
    }
    if (lowerTitle.includes("continue watching") || lowerTitle.includes("continue_watching")) {
      return ContentRailType.CONTINUE_WATCHING;
    }
    if (lowerTitle.includes("artist") || lowerTitle.includes("cast") || lowerTitle.includes("star")) {
      return ContentRailType.ARTIST;
    }
    if (lowerTitle.includes("genre") || lowerTitle.includes("category")) {
      return ContentRailType.GENRE;
    }
    if (lowerTitle.includes("upcoming") || lowerTitle.includes("coming soon") || lowerTitle.includes("coming_soon")) {
      return ContentRailType.UPCOMING_ON_JOJO;
    }
    if (lowerTitle.includes("carpet")) {
      return ContentRailType.RED_CARPET;
    }
    if (lowerTitle.includes("mixed") || lowerTitle.includes("series")) {
      return ContentRailType.SERIES_MIXED;
    }
    if (lowerTitle.includes("trending") || lowerTitle.includes("popular") || lowerTitle.includes("banner") || lowerTitle.includes("carousel")) {
      return ContentRailType.PORTRAIT;
    }
  }

  return ContentRailType.PORTRAIT;
}

export function isLandscapeImage(imgOrRatioId: any, displayType?: number | string): boolean {
  const ratioId = typeof imgOrRatioId === "object" && imgOrRatioId !== null ? imgOrRatioId?.ratio_id : imgOrRatioId;
  const ratioIdNum = Number(ratioId);
  const displayTypeNum = displayType !== undefined ? Number(displayType) : undefined;

  if (displayTypeNum !== undefined) {
    if (
      displayTypeNum === ApiDisplayType.SERIES ||
      displayTypeNum === ApiDisplayType.LANDSCAPE ||
      displayTypeNum === ApiDisplayType.AUTO_LANDSCAPE
    ) {
      return ratioIdNum === ApiImageRatio.LANDSCAPE;
    }
  }
  return ratioIdNum === ApiImageRatio.LANDSCAPE;
}

export function isPortraitImage(imgOrRatioId: any, displayType?: number | string): boolean {
  const ratioId = typeof imgOrRatioId === "object" && imgOrRatioId !== null ? imgOrRatioId.ratio_id : imgOrRatioId;
  const ratioIdNum = Number(ratioId);
  const displayTypeNum = displayType !== undefined ? Number(displayType) : undefined;

  if (displayTypeNum !== undefined) {
    if (
      displayTypeNum === ApiDisplayType.TOP_10 ||
      displayTypeNum === ApiDisplayType.PORTRAIT ||
      displayTypeNum === ApiDisplayType.CR_15 ||
      displayTypeNum === ApiDisplayType.CR_16 ||
      displayTypeNum === ApiDisplayType.CR_17
    ) {
      return ratioIdNum === ApiImageRatio.PORTRAIT || ratioIdNum === ApiImageRatio.PORTRAIT_4;
    }
  }
  return ratioIdNum === ApiImageRatio.PORTRAIT || ratioIdNum === ApiImageRatio.PORTRAIT_4;
}

export function isPosterImage(imgOrRatioId: any, displayType?: number | string): boolean {
  const ratioId = typeof imgOrRatioId === "object" && imgOrRatioId !== null ? imgOrRatioId.ratio_id : imgOrRatioId;
  const ratioIdNum = Number(ratioId);
  if (displayType !== undefined) {
    const displayTypeNum = Number(displayType);
    if (displayTypeNum === ApiDisplayType.MAIN_CAROUSEL) return ratioIdNum === ApiImageRatio.POSTER_3;
    if (displayTypeNum === ApiDisplayType.MAIN_CAROUSEL_14) return ratioIdNum === ApiImageRatio.POSTER_7;
  }
  return ratioIdNum === ApiImageRatio.POSTER_3 || ratioIdNum === ApiImageRatio.POSTER_7 || ratioIdNum === ApiImageRatio.LANDSCAPE;
}

export function getLandscapeImage(imgArr: any[] | undefined, displayType?: number | string): string | undefined {
  if (!Array.isArray(imgArr) || imgArr.length === 0) return undefined;
  const match = imgArr.find((img: any) => isLandscapeImage(img, displayType));
  if (match?.url) return match?.url;
  const defaultImg = imgArr.find((img: any) => img?.is_default);
  return defaultImg?.url || imgArr[0]?.url || undefined;
}

export function getPortraitImage(imgArr: any[] | undefined, displayType?: number | string): string | undefined {
  if (!Array.isArray(imgArr) || imgArr.length === 0) return undefined;
  const match = imgArr.find((img: any) => isPortraitImage(img, displayType));
  if (match?.url) return match?.url;
  const defaultImg = imgArr.find((img: any) => img?.is_default);
  return defaultImg?.url || imgArr[0]?.url || undefined;
}

export function getPosterImage(imgArr: any[] | undefined, displayType?: number | string): string | undefined {
  if (!Array.isArray(imgArr) || imgArr.length === 0) return undefined;
  const match = imgArr.find((img: any) => isPosterImage(img, displayType));
  if (match?.url) return match?.url;
  const defaultImg = imgArr.find((img: any) => img?.is_default);
  return defaultImg?.url || imgArr[0]?.url || undefined;
}
export function getHeroPosterImage(imgArr: any[] | undefined): string | undefined {
  if (!Array.isArray(imgArr) || imgArr.length === 0) return undefined;
  const match = imgArr.find((img: any) => Number(img?.ratio_id) === 1);
  return match?.url;
}

export function mapApiRailItem(
  cr_item: any,
  index: number,
  displayType?: number | string,
  isGenreRail?: boolean
): ContentRailItem {
  const asset = cr_item?.details || cr_item?.asset || cr_item;

  let title = "";
  let image = "";
  let portraitImage: string | undefined = undefined;
  let landscapeImage: string | undefined = undefined;
  let posterImage: string | undefined = undefined;
  let heroImage: string | undefined = undefined;

  const isGenre =
    isGenreRail ||
    String(displayType) === "4" ||
    String(displayType).toLowerCase() === "genre" ||
    !!cr_item?.genre;

  if (isGenre) {
    title = cr_item?.genre?.name || cr_item?.name || cr_item?.title || "";
    image = cr_item?.genre?.image || cr_item?.image || "";
  } else {
    title =
      asset?.asset_title ||
      asset?.title ||
      cr_item?.title ||
      asset?.name_analytics ||
      "Untitled";

    if (asset) {
      portraitImage =
        getPortraitImage(asset?.portrait, displayType) ||
        (typeof asset?.portrait === "object" && asset?.portrait !== null && "url" in asset.portrait ? asset.portrait.url : undefined) ||
        (typeof asset?.portraitImage === "string" ? asset.portraitImage : undefined) ||
        (typeof asset?.portrait_image === "string" ? asset.portrait_image : undefined) ||
        (typeof asset?.portrait === "string" ? asset.portrait : undefined);

      landscapeImage =
        getLandscapeImage(asset?.landscape, displayType) ||
        (typeof asset?.landscape === "object" && asset?.landscape !== null && "url" in asset.landscape ? asset.landscape.url : undefined) ||
        (typeof asset?.landscapeImage === "string" ? asset.landscapeImage : undefined) ||
        (typeof asset?.landscape_image === "string" ? asset.landscape_image : undefined) ||
        (typeof asset?.landscape === "string" ? asset.landscape : undefined);

      // For CW socket items, poster array may only have ratio_id=1 (landscape-shaped poster).
      // Try all known poster/image arrays before giving up.
      const rawPosterArr = Array.isArray(asset?.poster) ? asset.poster : undefined;
      const rawPortraitArr = Array.isArray(asset?.portrait) ? asset.portrait : undefined;
      const rawLandscapeArr = Array.isArray(asset?.landscape) ? asset.landscape : undefined;

      const heroPosterUrl = rawPosterArr?.find((img: any) => Number(img?.ratio_id) === 1)?.url;
      posterImage =
        heroPosterUrl ||
        getPosterImage(rawPosterArr, displayType) ||
        // Try picking any URL directly from the poster array (ratio_id agnostic)
        (rawPosterArr?.[0]?.url) ||
        // Fall back to portrait array
        (rawPortraitArr?.[0]?.url) ||
        // Fall back to landscape array
        (rawLandscapeArr?.[0]?.url) ||
        (typeof asset?.poster === "object" && asset?.poster !== null && "url" in asset.poster ? asset.poster.url : undefined) ||
        (typeof asset?.posterImage === "string" ? asset.posterImage : undefined) ||
        (typeof asset?.poster_image === "string" ? asset.poster_image : undefined) ||
        (typeof asset?.poster === "string" ? asset.poster : undefined);

      heroImage = heroPosterUrl || getHeroPosterImage(rawPosterArr || rawLandscapeArr);

      image =
        portraitImage ||
        landscapeImage ||
        posterImage ||
        (typeof asset?.image === "string" ? asset.image : undefined) ||
        (typeof asset?.thumbnail === "string" ? asset.thumbnail : undefined) ||
        cr_item?.image ||
        cr_item?.thumbnail ||
        "";
    } else {
      image = cr_item?.image || cr_item?.thumbnail || "";
    }
  }

  const assetCategory = asset?.asset_category;
  const isAVOD = assetCategory === ApiAssetCategory.AVOD;
  const isSVOD = assetCategory === ApiAssetCategory.SVOD;
  const isTVOD = assetCategory === ApiAssetCategory.TVOD;
  const isFVOD = assetCategory === ApiAssetCategory.FVOD;
  const isLVOD = assetCategory === ApiAssetCategory.LVOD;
  const isPremium = isSVOD || isTVOD;

  const year = asset?.asset_release_date ? asset.asset_release_date.split("-")[0] : undefined;

  const rawDuration = asset?.asset_total_duration ? parseFloat(asset.asset_total_duration) : 0;
  const isShow = asset?.asset_type === 2;
  const duration = isShow
    ? (asset?.seasons?.length
      ? `${asset.seasons.length} Season${asset.seasons.length > 1 ? "s" : ""}`
      : undefined)
    : rawDuration
      ? `${Math.floor(rawDuration / 3600)}h ${Math.floor((rawDuration % 3600) / 60)}m`
      : undefined;

  const ageRating = asset?.asset_certification || asset?.certification;

  // Seekbar progress calculation for continue watching items
  const durationSec = asset?.duration || asset?.asset_total_duration
    ? parseFloat(asset.duration || asset.asset_total_duration)
    : 0;

  const progressSec = cr_item?.progress !== undefined
    ? parseFloat(cr_item.progress)
    : (asset?.progress !== undefined
      ? parseFloat(asset.progress)
      : 0);

  const progressPercentage = durationSec > 0 ? (progressSec / durationSec) * 100 : 0;

  const realAssetId = String(
    asset?.asset_id ||
    asset?.assetId ||
    cr_item?.asset_id ||
    cr_item?.item_id ||
    cr_item?.id ||
    asset?.id ||
    ""
  );

  return {
    id: String(
      cr_item?.item_id ||
      asset?.asset_id ||
      asset?.assetId ||
      cr_item?.id ||
      asset?.id ||
      (title && title !== "Untitled" ? `${title}-${index}` : index)
    ),
    assetId: realAssetId,
    progressPercentage,
    progressSeconds: progressSec,
    title,
    subtitle: asset?.asset_short_description,
    description: asset?.asset_description,
    image,
    portraitImage,
    landscapeImage,
    posterImage,
    heroImage,
    thumbnailImage: image,
    title_image: asset?.title_image,
    year,
    duration,
    ageRating,
    certification: ageRating,
    genres: asset?.asset_genre,
    asset_tags_badgeText: asset?.asset_tags?.[0],
    previewUrl: asset?.preview_url || cr_item?.preview_url || cr_item?.previewUrl || asset?.previewUrl,
    isTop10: asset?.isintop10,
    numberintop10: asset?.numberintop10,
    rank: asset?.numberintop10 !== undefined && asset?.numberintop10 !== null
      ? Number(asset.numberintop10)
      : (cr_item?.numberintop10 !== undefined && cr_item?.numberintop10 !== null
        ? Number(cr_item.numberintop10)
        : index + 1),
    redirectUrl: cr_item?.redirect_url || asset?.redirect_url || cr_item?.genre?.redirect_url || cr_item?.redirectUrl || asset?.redirectUrl || cr_item?.genre?.redirectUrl,

    // Asset classifications
    classifications: Array.isArray(asset?.asset_classifications) ? asset.asset_classifications : undefined,
    assetCategory: asset?.asset_category || (isTVOD ? "tvod" : isSVOD ? "svod" : isAVOD ? "avod" : isFVOD ? "fvod" : isLVOD ? "lvod" : undefined),
    tags: Array.isArray(asset?.asset_tags) ? asset.asset_tags : (asset?.asset_tags_badgeText ? [asset.asset_tags_badgeText] : undefined),
    isSVOD,
    isTVOD,
    isFVOD,
    isAVOD,
    isLVOD,
    isPremium,
    assetType: (asset?.asset_type || cr_item?.asset_type) === 1 ? "MOVIE" : (asset?.asset_type || cr_item?.asset_type) === 2 ? "SHOW" : (asset?.asset_type || cr_item?.asset_type) === 5 ? "EPISODE" : undefined,
    assetTypeCode: (asset?.asset_type || cr_item?.asset_type) ? Number(asset?.asset_type || cr_item?.asset_type) : undefined,
    name_analytics: cr_item?.genre?.name_analytics || cr_item?.name_analytics || asset?.name_analytics || title,
  };
}

export function mapApiRail(rail: any, index: number): ContentRailData {
  const title = rail?.cr_name || rail?.title;
  const rawItems = rail?.cr_items || rail?.content_rail_items || rail?.items;
  const displayType = rail?.cr_display_type || rail?.display_type;
  const type = mapApiRailType(displayType, title);

  return {
    id: String(rail?.cr_id),
    title,
    type,
    items: (rawItems || [])?.map((item: any, idx: number) => mapApiRailItem(item, idx, displayType, type === ContentRailType.GENRE)),
    totalPages: rail?.total_pages !== undefined ? Number(rail.total_pages) : undefined,
    currentPage: rail?.current_page !== undefined ? Number(rail.current_page) : undefined,
    limit: rail?.limit !== undefined ? Number(rail.limit) : undefined,
    button_name: rail?.button_name || undefined,
    more_enabled: rail?.more_enabled !== undefined ? (rail.more_enabled === true) : false,
  };
}