import { fetchSitemapAssetsByPage } from "@/lib/seo/sitemapFetcher";
import { escapeXml } from "@/lib/seo/xmlEscaper";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ category: string; id: string }> }
) {
  const params = await props.params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jojoapp.in";
  
  const allowedCategories = ["movies", "shows", "natak", "kidz"];
  if (!allowedCategories.includes(params.category)) {
    return new Response(`Invalid category: received '${params.category}'`, { status: 404 });
  }

  // Clean the id (e.g., '1.xml' -> 1)
  const pageStr = params.id.replace('.xml', '');
  const targetPage = parseInt(pageStr, 10);
  
  if (isNaN(targetPage) || targetPage < 1) {
    return new Response("Invalid page ID", { status: 400 });
  }

  // Use a ReadableStream to stream XML chunks and avoid massive memory allocations
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let totalAssets = 0;
      let skippedAssets = 0;
      let byteCount = 0;

      const enqueue = (str: string) => {
        const bytes = new TextEncoder().encode(str);
        byteCount += bytes.byteLength;
        controller.enqueue(bytes);
      };

      // 1. Write the XML Header
      const header = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
      enqueue(header);

      // 2. Fetch all assets across all pages, then STRICTLY filter by category
      const { fetchAllFilteredAssets } = await import("@/lib/seo/sitemapFetcher");
      const filteredItems = await fetchAllFilteredAssets(params.category);
      
      // 3. Paginate the filtered items (100 items per XML chunk)
      const itemsPerChunk = 100;
      const startIndex = (targetPage - 1) * itemsPerChunk;
      const paginatedChunk = filteredItems.slice(startIndex, startIndex + itemsPerChunk);

      if (paginatedChunk.length > 0) {
        for (const asset of paginatedChunk) {

          // Format slug into title if title is missing
          const formattedTitle = asset.slug 
            ? asset.slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            : "Unknown Title";
            
          const assetTitle = asset.title || formattedTitle;

          // Provide fallback for empty thumbnails (and handle whitespace-only strings)
          const rawThumb = asset.thumbnail_url || asset.poster || asset.image || "";
          const finalThumbnail = (rawThumb && typeof rawThumb === "string" && rawThumb.trim() !== "") 
            ? rawThumb.trim() 
            : `${siteUrl}/default-thumbnail.jpg`;

          // Strict Asset Validation (removed 'title' and 'thumbnail_url' requirements since backend often sends empty strings)
          if (!asset.id || !asset.slug || !asset.updated_at) {
            skippedAssets++;
            continue;
          }

          // Strict limits tracking (50k URLs or 50MB limits per chunk)
          if (totalAssets >= 50000 || byteCount >= (49 * 1024 * 1024)) {
            break; 
          }

          const loc = `${siteUrl}/${params.category}/${asset.slug}/${asset.id}`;
          const playerLoc = `${siteUrl}/watch/${asset.id}`;
          
          let xmlChunk = `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(asset.updated_at)}</lastmod>
    <video:video>
      <video:thumbnail_loc>${escapeXml(finalThumbnail)}</video:thumbnail_loc>
      <video:title><![CDATA[${assetTitle}]]></video:title>
      <video:description><![CDATA[${asset.description || ""}]]></video:description>
      <video:player_loc>${escapeXml(playerLoc)}</video:player_loc>
      ${asset.duration_seconds > 0 ? `<video:duration>${asset.duration_seconds}</video:duration>` : ""}
      ${asset.release_date ? `<video:publication_date>${escapeXml(asset.release_date)}</video:publication_date>` : ""}
      <video:family_friendly>${asset.is_family_friendly ? "yes" : "no"}</video:family_friendly>
      <video:requires_subscription>${asset.is_premium ? "yes" : "no"}</video:requires_subscription>
    </video:video>
    <image:image>
      <image:loc>${escapeXml(finalThumbnail)}</image:loc>
    </image:image>
  </url>\n`;

          enqueue(xmlChunk);
          totalAssets++;
        }
      }

      // 3. Write urlset closing tag
      enqueue(`</urlset>`);
      controller.close();

      // CloudWatch Structured Logging Payload
      console.log(JSON.stringify({
        event: "sitemap_generation_complete",
        category: params.category,
        page: targetPage,
        generation_time_ms: Date.now() - startTime,
        total_assets: totalAssets,
        skipped_assets: skippedAssets,
        bytes_generated: byteCount
      }));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate",
    },
  });
}
