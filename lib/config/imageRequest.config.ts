/**
 * JOJOImageRequestConfiguration
 *
 * Implements the JOJO CDN image resizing specification matching the iOS/tvOS
 * JOJOImageRequestConfiguration architecture.
 *
 * Appends sanitized `width`, `height`, `fit`, `quality`, and `format` parameters
 * to remote HTTP/HTTPS image URLs for optimized network and memory usage on webOS TV.
 */

export enum JOJOImageFit {
  Cover = "cover",
  Contain = "contain",
  Fill = "fill",
  Inside = "inside",
  Outside = "outside",
}

export namespace JOJOImageFit {
  export function resolved(contentMode?: string): JOJOImageFit {
    switch (contentMode?.toLowerCase()) {
      case "contain":
      case "scale-down":
        return JOJOImageFit.Contain;
      case "fill":
        return JOJOImageFit.Fill;
      case "inside":
        return JOJOImageFit.Inside;
      case "outside":
        return JOJOImageFit.Outside;
      default:
        return JOJOImageFit.Cover;
    }
  }
}

export interface JOJOCGSize {
  width: number;
  height: number;
}

export class JOJOImageRequestConfiguration {
  static quality: number = 80;
  static format: string = "webp";
  static maximumPixelDimension: number = 1600;
  static minimumTargetDimension: number = 40;

  static get fallbackTargetSize(): JOJOCGSize {
    return { width: 600, height: 338 };
  }

  static sanitizedQuality(value: number): number {
    return Math.min(Math.max(value, 1), 100);
  }

  static sanitizedTargetSize(value: JOJOCGSize): JOJOCGSize {
    const width = Math.max(0, value.width);
    const height = Math.max(0, value.height);

    if (
      width < this.minimumTargetDimension ||
      height < this.minimumTargetDimension
    ) {
      return { ...this.fallbackTargetSize };
    }

    const maxSide = Math.max(width, height);

    if (maxSide <= this.maximumPixelDimension) {
      return { width, height };
    }

    const scale = this.maximumPixelDimension / maxSide;
    return {
      width: Math.max(1, width * scale),
      height: Math.max(1, height * scale),
    };
  }

  static shouldRetryOriginal(error?: any): boolean {
    if (!error) return true;
    const description = String(error?.message || error?.type || error).toLowerCase();
    const nonRetryableMarkers = [
      "taskcancelled",
      "task cancelled",
      "task canceled",
      "cancelled",
      "canceled",
      "notcurrentsourcetask",
      "not current source task",
      "abort",
    ];

    return !nonRetryableMarkers.some((marker) => description.includes(marker));
  }
}

/**
 * Image formats and asset paths that support alpha / transparency.
 * We MUST NOT resize or convert these via the CDN resizer because the
 * CDN resizer strips the alpha channel / fills transparent canvas with solid black.
 */
const TRANSPARENCY_FORMATS = new Set(["png", "svg", "gif", "apng", "avif"]);

/**
 * Returns the file extension (without dot, lowercased) from a URL pathname.
 */
function getPathExtension(pathname: string): string {
  const lastDot = pathname.lastIndexOf(".");
  if (lastDot === -1 || lastDot === pathname.length - 1) return "";
  return pathname.substring(lastDot + 1).toLowerCase();
}

/**
 * Determines if an asset URL points to a title image, logo, badge, icon,
 * or format that relies on alpha transparency.
 */
function isTransparentOrTitleAsset(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  if (
    lower.includes("/titleimages/") ||
    lower.includes("/title_images/") ||
    lower.includes("/titleart/") ||
    lower.includes("/title_art/") ||
    lower.includes("/logos/") ||
    lower.includes("/icons/") ||
    lower.includes("/badges/")
  ) {
    return true;
  }
  const ext = getPathExtension(lower);
  return TRANSPARENCY_FORMATS.has(ext);
}

/**
 * Generates an optimized, resized CDN image URL with sanitized target size, fit, quality, and format.
 *
 * IMPORTANT: For transparent assets (title images, logos, badges, PNGs, etc.),
 * the original URL is returned untouched to prevent the CDN from flattening transparency to black.
 */
export function jojoResizedImageURL(
  url: string | null | undefined,
  options?: {
    targetSize?: JOJOCGSize;
    fit?: JOJOImageFit | string;
    quality?: number;
    format?: string;
  }
): string {
  if (!url || typeof url !== "string") return url || "";

  // Only rewrite remote HTTP/HTTPS images
  const lower = url.trim().toLowerCase();
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);

    // Title images, logos, and transparent formats must NEVER have CDN resize
    // parameters added because the CDN resizer fills the background with solid black.
    if (isTransparentOrTitleAsset(parsedUrl.pathname)) {
      return url;
    }

    const targetSize = options?.targetSize || JOJOImageRequestConfiguration.fallbackTargetSize;
    const requestSize = JOJOImageRequestConfiguration.sanitizedTargetSize(targetSize);
    const width = Math.ceil(requestSize.width);
    const height = Math.ceil(requestSize.height);
    const quality = JOJOImageRequestConfiguration.sanitizedQuality(
      options?.quality ?? JOJOImageRequestConfiguration.quality
    );
    const format = options?.format ?? JOJOImageRequestConfiguration.format;
    const fit = options?.fit ?? JOJOImageFit.Cover;

    const reservedKeys = new Set(["width", "height", "fit", "quality", "format"]);

    // Filter out existing reserved query parameters to prevent duplicates
    const searchParams = new URLSearchParams();
    parsedUrl.searchParams.forEach((value, key) => {
      if (!reservedKeys.has(key.toLowerCase())) {
        searchParams.append(key, value);
      }
    });

    searchParams.append("width", String(width));
    searchParams.append("height", String(height));
    searchParams.append("fit", typeof fit === "string" ? fit : (fit as JOJOImageFit));
    searchParams.append("quality", String(quality));

    // Only add format conversion when the source doesn't already use the target format
    if (
      format &&
      !parsedUrl.pathname.toLowerCase().endsWith(`.${format.toLowerCase()}`)
    ) {
      searchParams.append("format", format);
    }

    parsedUrl.search = searchParams.toString();
    return parsedUrl.toString();
  } catch {
    return url;
  }
}
