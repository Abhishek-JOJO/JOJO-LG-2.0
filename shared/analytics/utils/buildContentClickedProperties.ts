import type { ContentRailItem } from "@/components/content-rail/config/contentRail.types";
import { mapAnalyticsAssetCategory } from "./mapAnalyticsAssetCategory";

/**
 * Helper to build enriched properties for content_clicked event
 */
export function buildContentClickedProperties(
  item: ContentRailItem,
  railName?: string,
  railId?: string | number,
  displayType?: string | number,
  itemPosition?: number
): Record<string, any> {
  if (!item) return {};

  const isMovie = item.assetTypeCode === 1 || item.assetType === '1' || item.assetType === 'MOVIE' || item.assetType === 'movie';
  const isShow = item.assetTypeCode === 2 || item.assetType === '2' || item.assetType === 'SHOW' || item.assetType === 'show' || item.assetType === 'series';
  const isEpisode = item.assetTypeCode === 5 || item.assetType === '5' || item.assetType === 'EPISODE' || item.assetType === 'episode';

  const assetType = isMovie ? 'movie' : isShow ? 'show' : isEpisode ? 'episode' : (item.assetType ? String(item.assetType).toLowerCase() : 'movie');

  let assetCategory = mapAnalyticsAssetCategory(item.assetCategory ?? (item as any).asset_category);
  
  if (!assetCategory) {
    if (item.isTVOD) assetCategory = 'tvod';
    else if (item.isSVOD) assetCategory = 'svod';
    else if (item.isAVOD) assetCategory = 'avod';
    else if (item.isFVOD) assetCategory = 'fvod';
    else if (item.isLVOD) assetCategory = 'lvod';
    else assetCategory = 'svod';
  }

  // Convert numeric display type to human readable string if needed
  let displayTypeStr = typeof displayType === 'string' ? displayType : '';
  if (typeof displayType === 'number' || (!displayTypeStr && displayType !== undefined)) {
    const dtMap: Record<string, string> = {
      '1': 'main carousel',
      '2': 'portrait',
      '3': 'landscape',
      '4': 'genre',
      '5': 'continue watching',
      '6': 'top 10',
      '7': 'artist',
      '8': 'upcoming',
      '9': 'series mixed',
    };
    displayTypeStr = dtMap[String(displayType)] || String(displayType);
  }

  const rawAssetId = item.assetId || item.id;
  const numericAssetId = rawAssetId !== undefined && rawAssetId !== '' && !isNaN(Number(rawAssetId)) ? Number(rawAssetId) : rawAssetId;

  const rawRailId = railId !== undefined && railId !== '' ? railId : undefined;
  const numericRailId = rawRailId !== undefined && !isNaN(Number(rawRailId)) ? Number(rawRailId) : rawRailId;

  const props: Record<string, any> = {
    asset_id: numericAssetId,
    asset_name: item.title || item.name_analytics || '',
    asset_title: item.title || item.name_analytics || '',
    asset_type: assetType,
    asset_category: assetCategory,
    content_rail_name: railName || '',
    rail_name: railName || '',
    content_rail_display_type: displayTypeStr || 'main carousel',
    rail_display_type: displayTypeStr || 'main carousel',
    in_top_10: Boolean(item.isTop10),
    is_top_10: Boolean(item.isTop10),
    item_position: itemPosition,
  };

  if (numericRailId !== undefined) {
    props.content_rail_id = numericRailId;
    props.rail_id = numericRailId;
  }

  if (item.numberintop10 !== undefined) {
    props.number_in_top_10 = Number(item.numberintop10);
  } else if (item.isTop10 && itemPosition !== undefined) {
    props.number_in_top_10 = itemPosition + 1;
  }

  // Map genre array to genre_<slug>: "Genre Name"
  if (Array.isArray(item.genres)) {
    item.genres.forEach((genre: any) => {
      if (genre) {
        const genreStr = typeof genre === 'string' ? genre : (genre.name || genre.title || genre.name_analytics || String(genre));
        if (typeof genreStr === 'string' && genreStr) {
          const slug = genreStr.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          if (slug) {
            props[`genre_${slug}`] = genreStr;
          }
        }
      }
    });
  }

  // Map tag array to tag_<slug>: "Tag Name"
  const tags = item.tags || (item.asset_tags_badgeText ? [item.asset_tags_badgeText] : []);
  if (Array.isArray(tags)) {
    tags.forEach((tag: any) => {
      if (tag) {
        const tagStr = typeof tag === 'string' ? tag : (tag.name || tag.title || String(tag));
        if (typeof tagStr === 'string' && tagStr) {
          const slug = tagStr.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          if (slug) {
            props[`tag_${slug}`] = tagStr;
          }
        }
      }
    });
  }

  return props;
}
