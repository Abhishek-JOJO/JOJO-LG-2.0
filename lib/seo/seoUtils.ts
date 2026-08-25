/**
 * SEO Utility Functions
 * Shared helpers for generating clean, optimized meta tags across all pages.
 */

/**
 * Strip all HTML tags from a string and collapse whitespace.
 * Used to clean API descriptions that contain raw HTML (e.g. `<p><span style="...">text</span></p>`)
 * before using them in meta description tags.
 */
export function stripHtmlTags(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")       // Remove all HTML tags
    .replace(/&nbsp;/g, " ")        // Replace &nbsp; entities
    .replace(/&amp;/g, "&")         // Replace &amp; entities
    .replace(/&lt;/g, "<")          // Replace &lt; entities
    .replace(/&gt;/g, ">")          // Replace &gt; entities
    .replace(/&quot;/g, '"')        // Replace &quot; entities
    .replace(/&#39;/g, "'")         // Replace &#39; entities
    .replace(/\s+/g, " ")           // Collapse multiple whitespace to single space
    .trim();
}

/**
 * Sanitize and truncate a description for use in meta tags.
 * - Strips HTML tags
 * - Truncates to maxLength (default 155 chars for Google)
 * - Adds ellipsis if truncated
 * - Never breaks in the middle of a word
 */
export function sanitizeMetaDescription(raw: string, maxLength = 155): string {
  const clean = stripHtmlTags(raw);
  if (!clean) return "";
  if (clean.length <= maxLength) return clean;

  // Truncate at last space before maxLength to avoid breaking words
  const truncated = clean.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + "...";
}

/**
 * Build a short, SEO-friendly title that stays within 50-60 chars.
 * Format: "Asset Title | Watch on JOJO"
 * If the asset has a custom seoTitle, use that directly.
 */
export function buildSeoTitle(
  assetTitle: string,
  seoTitle: string | null,
  categoryLabel?: string
): string {
  if (seoTitle) return seoTitle;
  if (!assetTitle) return "JOJO - Premium Gujarati Entertainment";

  const suffix = " | Watch on JOJO";
  const maxTitleLength = 60;

  // If title + suffix fits, use it
  if ((assetTitle + suffix).length <= maxTitleLength) {
    return assetTitle + suffix;
  }

  // Truncate title to fit within 60 chars
  const maxAssetLength = maxTitleLength - suffix.length;
  const truncatedTitle = assetTitle.length > maxAssetLength
    ? assetTitle.substring(0, maxAssetLength - 3) + "..."
    : assetTitle;

  return truncatedTitle + suffix;
}

/**
 * Generate genre-based keywords for an asset.
 */
export function buildAssetKeywords(
  assetTitle: string,
  genres: string[],
  assetType: string,
  categoryLabel: string
): string[] {
  const keywords: string[] = [];

  if (assetTitle) {
    keywords.push(assetTitle);
    keywords.push(`${assetTitle} online`);
    keywords.push(`watch ${assetTitle}`);
  }

  // Add genre keywords
  genres.forEach((genre) => {
    keywords.push(`Gujarati ${genre.toLowerCase()}`);
  });

  // Add type keywords
  keywords.push(categoryLabel);
  keywords.push(`Gujarati ${categoryLabel.toLowerCase()}`);
  keywords.push("JOJO app");
  keywords.push("Gujarati OTT");
  keywords.push("watch Gujarati entertainment online");

  return keywords;
}

/**
 * Proxy an external CDN image URL through Next.js Image Optimization.
 * This ensures OG images are served from the app's own domain, which:
 * - Social crawlers (WhatsApp, Telegram, X/Twitter) trust
 * - Avoids CDN CORS rejections on cross-origin OG images
 * - Resizes to 1200×630 (the social sharing standard)
 *
 * @param imageUrl - Raw CDN URL from the API
 * @param baseUrl  - The deployed app origin (e.g. https://jojoapp.in)
 */
export function buildOgImageUrl(imageUrl: string, baseUrl: string = "https://jojoapp.in"): string {
  const defaultFallback = `${baseUrl}/logos/JOJO-GOLD-LOGO.png`;
  if (!imageUrl) return defaultFallback;

  // Absolute external URL -> return direct HTTPS URL for crawlers
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl.replace(/^http:\/\//i, "https://");
  }

  // Relative path -> resolve against base
  return `${baseUrl}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
}

/**
 * Build the full metadata object for an asset detail page.
 * Centralizes all SEO logic to ensure consistency across movies, shows, nataks, kids pages.
 */
export function buildAssetMetadata({
  title,
  description,
  canonicalUrl,
  imageUrl,
  ogType,
  keywords,
  baseUrl = "https://jojoapp.in",
}: {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  ogType: "video.movie" | "video.tv_show" | "video.episode";
  keywords: string[];
  /** App origin used to proxy OG images. Defaults to production domain. */
  baseUrl?: string;
}) {
  // Always proxy through /_next/image so the OG image is served from our domain.
  // WhatsApp / Telegram / X reject cross-origin CDN images without CORS headers.
  const finalImageUrl = buildOgImageUrl(imageUrl, baseUrl);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "JOJO App",
      locale: "en_IN",
      type: ogType,
      images: [
        {
          url: finalImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      site: "@jojoapp_in",
      title,
      description,
      images: [finalImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1 as const,
        "max-image-preview": "large" as const,
        "max-snippet": -1 as const,
      },
    },
  };
}
