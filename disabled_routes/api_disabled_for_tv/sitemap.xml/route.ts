import { fetchSitemapAssetsByPage } from "@/lib/seo/sitemapFetcher";

export const dynamic = 'force-dynamic';

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jojoapp.in";
  
  // List of active OTT categories that have dynamic backend sitemaps
  const categories = ["movies", "shows", "natak", "kidz"];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  const now = new Date().toISOString();

  // 1. Add the static pages sitemap (Home, Movies, Shows, Nataks, Privacy Policy, etc.)
  xml += `  <sitemap>\n    <loc>${siteUrl}/sitemap/pages.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;

  // 2. We fetch page 1 of each category to dynamically determine total_pages
  for (const category of categories) {
    try {
      // NOTE: Our fetcher hits `/jojo-sitemap` without a category filter right now. 
      // If the backend `/jojo-sitemap` supports `&type=movies`, we would pass that. 
      // Assuming it does, or if we just want one massive sitemap across all types:
      // For this implementation, we will assume `/jojo-sitemap?type=${category}` is supported.
      
      // 1. Fetch and filter ALL assets into memory (Next.js aggressively caches this)
      const { fetchAllFilteredAssets } = await import("@/lib/seo/sitemapFetcher");
      const filteredItems = await fetchAllFilteredAssets(category);
      
      // 2. We will paginate them at 100 items per XML chunk (frontend-enforced)
      const itemsPerChunk = 100;
      const totalPages = Math.ceil(filteredItems.length / itemsPerChunk) || 1;
      
      // 3. Output the exact number of true chunks
      for (let i = 1; i <= totalPages; i++) {
        xml += `  <sitemap>\n    <loc>${siteUrl}/sitemap/${category}/${i}.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;
      }
    } catch (e) {
      console.error(`[SitemapIndex] Failed to fetch total_pages for category ${category}`, e);
      // Graceful fallback: just link to page 1 if API is down
      xml += `  <sitemap>\n    <loc>${siteUrl}/sitemap/${category}/1.xml</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>\n`;
    }
  }

  xml += `</sitemapindex>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate",
    },
  });
}
