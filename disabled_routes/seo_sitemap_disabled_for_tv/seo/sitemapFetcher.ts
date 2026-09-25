export interface SitemapAsset {
  id: number;
  slug: string;
  type: string;
  updated_at: string;
  thumbnail_url: string;
  description: string;
  release_date: string;
  duration_seconds: number;
  is_premium: boolean;
  is_family_friendly: boolean;
  title?: string;
  poster?: string;
  image?: string;
}

export interface SitemapApiResponse {
  data: SitemapAsset[];
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
  };
}

export async function fetchSitemapAssetsByPage(category: string, page: number, maxRetries = 3): Promise<SitemapApiResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.jojoapp.in";
  const url = `${baseUrl}/jojo-sitemap?type=${category}&page=${page}&limit=1000`;

  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second strict timeout

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "devicetypecode": "3",
          "language": "1",
          "page": page.toString()
        },
        cache: "no-store",
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend returned ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      console.log(`\n\n=== [SitemapFetcher] FULL API RESPONSE for ${url} ===\n`);
      console.log(JSON.stringify(json, null, 2));
      console.log(`\n======================================================\n\n`);

      if (json.data && Array.isArray(json.data)) {
         console.log(`[SitemapFetcher] Found ${json.data.length} items in json.data`);
      } else {
         console.warn(`[SitemapFetcher] WARNING: json.data is empty or not an array. Actual JSON structure:`, JSON.stringify(json).slice(0, 300));
      }
      return json as SitemapApiResponse;
    } catch (error: any) {
      attempt++;
      console.error(`[SitemapFetcher] Attempt ${attempt} Failed for URL: ${url}. Error:`, error.message);
      if (attempt > maxRetries) {
        console.error(`[SitemapFetcher] Giving up after ${maxRetries} retries.`);
        return null;
      }
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return null;
}

// ------------------------------------------------------------------------------------
// FRONTEND SHIELD PAGINATION OVERRIDE
// Since the backend ignores all filters and returns global pagination (mixed types),
// this helper fetches ALL pages of the global response, merges them, and filters them
// on the Next.js side, returning an array of perfectly filtered assets.
// ------------------------------------------------------------------------------------
export async function fetchAllFilteredAssets(category: string): Promise<SitemapAsset[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.jojoapp.in";
  
  // 1. Fetch page 1 to see how many total global pages exist
  const res1 = await fetch(`${baseUrl}/jojo-sitemap?page=1&limit=1000`, {
    headers: { "devicetypecode": "3", "language": "1", "page": "1" },
    cache: "no-store"
  });
  
  if (!res1.ok) return [];
  const json1 = await res1.json();
  const totalPages = json1.totalPages || json1.pagination?.total_pages || 1;
  
  let allAssets: SitemapAsset[] = json1.data && Array.isArray(json1.data) ? [...json1.data] : [];
  
  // 2. Fetch the rest of the global pages concurrently
  if (totalPages > 1) {
    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      promises.push(
        fetch(`${baseUrl}/jojo-sitemap?page=${i}&limit=1000`, {
          headers: { "devicetypecode": "3", "language": "1", "page": i.toString() },
          cache: "no-store"
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      );
    }
    const results = await Promise.all(promises);
    for (const res of results) {
      if (res && res.data && Array.isArray(res.data)) {
        allAssets.push(...res.data);
      }
    }
  }
  
  // 3. Apply the strict Frontend Filter
  return allAssets.filter(asset => asset.type === category);
}
