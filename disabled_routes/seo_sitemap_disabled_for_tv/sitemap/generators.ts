import { fetchCategoryUrls, getDynamicSubnavId } from "./api-services";
import { generateUrlSet } from "./xml-helpers";

export async function generateCategorySitemap(type: "movies" | "shows" | "natak" | "nataks" | "kidz" | "kids", basePath: string): Promise<string> {
  const subnavId = await getDynamicSubnavId(type);
  
  if (!subnavId) {
    // Return empty valid urlset if category not found
    return generateUrlSet([]);
  }

  const urls = await fetchCategoryUrls(subnavId, basePath);
  return generateUrlSet(urls);
}

export function generateStaticPagesSitemap(): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jojoapp.in";
  const now = new Date().toISOString();

  const staticUrls = [
    { loc: `${baseUrl}`, lastmod: now, changefreq: 'daily', priority: 1.0 },
    { loc: `${baseUrl}/movies`, lastmod: now, changefreq: 'daily', priority: 0.8 },
    { loc: `${baseUrl}/shows`, lastmod: now, changefreq: 'daily', priority: 0.8 },
    { loc: `${baseUrl}/nataks`, lastmod: now, changefreq: 'daily', priority: 0.8 },
    { loc: `${baseUrl}/kids`, lastmod: now, changefreq: 'daily', priority: 0.8 },
    { loc: `${baseUrl}/about`, lastmod: now, changefreq: 'monthly', priority: 0.5 },
    { loc: `${baseUrl}/contact`, lastmod: now, changefreq: 'monthly', priority: 0.5 },
    { loc: `${baseUrl}/terms-conditions`, lastmod: now, changefreq: 'monthly', priority: 0.5 },
    { loc: `${baseUrl}/privacy-policy`, lastmod: now, changefreq: 'monthly', priority: 0.5 },
    { loc: `${baseUrl}/subscription`, lastmod: now, changefreq: 'monthly', priority: 0.6 },
    { loc: `${baseUrl}/faq`, lastmod: now, changefreq: 'monthly', priority: 0.5 },
  ];

  return generateUrlSet(staticUrls);
}
